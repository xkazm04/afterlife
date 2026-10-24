// One poll of one project: read GitLab (MRs, notes, deployments, agent MRs' sizes and pipelines, the CI file's arm markers, the ledger), then write every derived row in one
// transaction. Reads come first, so a failed read writes nothing and the project keeps its last good rows.
import type { PGlite } from '@electric-sql/pglite';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlDeployment, GlGroup, GlMergeRequest, GlNote, GlProject } from '@/server/gitlab/types';
import { importLedger, type LedgerSource } from '@/server/ledger/importLedger';
import { importCycles } from '@/server/ledger/importCycles';
import { setProjectState, upsertProjects, type ProjectRow } from '@/server/index/repositories/fleet/project';
import { deleteProofs, upsertProofs } from '@/server/index/repositories/work/proof';
import { countOpenInbox } from '@/server/index/repositories/work/proposal';
import { getTaskRow, upsertTasks, type TaskDetail, type TaskRow } from '@/server/index/repositories/work/task';
import { recordPollError, recordPollOk, projectSource } from '@/server/index/repositories/pollState';
import { addMrFacts } from './mrFacts/facts';
import { getLastTaskEvent } from '@/server/index/views/events';
import type { Queryable } from '@/server/index/repositories/sql';
import type { PollerConfig } from './config';
import { deriveTask, type TaskDerivation } from './derive/task';
import { pollClasses } from './classes';
import { pollMaturityScan } from './maturityScan';
import { countProofs } from './derive/rollup';
import { readArmed } from './ci/armed';
import type { PolicyRead } from './derive/policy';
import type { PollMemory } from './state';
import type { StateHistory } from './stateHistory';
import { messageOf } from '@/lib/format/error';

export interface PollEnv {
  port: GitLabPort;
  db: PGlite;
  cfg: PollerConfig;
  now: Date;
  mem: PollMemory;
  group: GlGroup;
  policy: PolicyRead | null;
  /** tier-state.yml's commit list and record writers, when this cycle read them (the class receipts need both). */
  history: StateHistory | null;
  ledger: LedgerSource | null;
  /** The index's projects: read once per cycle, then each polled project's row is added or replaced here (no re-read). */
  known: ProjectRow[];
  /** Trust-class id -> track, from this cycle's policy or the index. */
  trackOf: (cls: string) => number | null;
}

export interface ProjectPoll {
  id: string;
  gitlabId: number;
  ok: boolean;
  error?: string;
  tasks: number;
  proofs: number;
  ledger: string;
  /** The cycle file: absent, unchanged or imported (a rejected one fails the feed like the ledger). */
  cycles?: string;
  issues: string[];
}

/** The index id of a GitLab project: the one already linked to it, else a seeded one of the same slug, else a new one. */
export function resolveProject(known: readonly ProjectRow[], gl: GlProject): { id: string; existing: ProjectRow | null } {
  const linked = known.find((p) => p.gitlabId === gl.id);
  if (linked) return { id: linked.id, existing: linked };
  const slug = known.find((p) => p.id === gl.path && p.gitlabId === null);
  if (slug) return { id: slug.id, existing: slug };
  return { id: known.some((p) => p.id === gl.path) ? `${gl.path}-${gl.id}` : gl.path, existing: null };
}

/** "acme-lab/core-banking/ledgerline" in group "acme-lab" -> "core-banking"; a project at the root -> the group's own path. */
export function groupPathOf(gl: GlProject, group: GlGroup): string {
  const rel = gl.pathWithNamespace.startsWith(`${group.fullPath}/`) ? gl.pathWithNamespace.slice(group.fullPath.length + 1) : gl.pathWithNamespace;
  const parts = rel.split('/').slice(0, -1);
  return parts.length > 0 ? parts.join('/') : group.path;
}

async function notesOf(env: PollEnv, gl: GlProject, mr: GlMergeRequest): Promise<GlNote[]> {
  const key = `${gl.id}!${mr.iid}`;
  const hit = env.mem.notes.get(key);
  if (hit && hit.updatedAt === mr.updatedAt) return hit.notes;
  const notes = await env.port.listNotes(gl.id, mr.iid);
  env.mem.notes.set(key, { updatedAt: mr.updatedAt, notes });
  return notes;
}

const mergeDetail = (prev: TaskDetail, next: TaskDetail, blocked: boolean): TaskDetail => {
  const merged: TaskDetail = { ...prev, ...next };
  if (!blocked && next.quote === undefined) {
    delete merged.quote;
    delete merged.reason;
  }
  return merged;
};

/** Derived task rows that keep what GitLab cannot restate (the chain, the counters) and never steal another task's id. */
async function mergeTask(db: Queryable, d: TaskDerivation, projectId: string, blocked: boolean, issues: string[]): Promise<TaskRow | null> {
  const prev = await getTaskRow(db, d.task.id);
  if (prev && (prev.projectId !== projectId || (prev.mrIid !== null && prev.mrIid !== d.task.mrIid))) {
    issues.push(`task ${d.task.id}: id already belongs to ${prev.projectId}${prev.mrIid !== null ? ` !${prev.mrIid}` : ''}; ignored`);
    return null;
  }
  if (!prev) return d.task;
  return {
    ...d.task,
    track: d.task.track ?? prev.track, actionClass: d.task.actionClass ?? prev.actionClass, tierAtTime: d.task.tierAtTime ?? prev.tierAtTime,
    startedAt: d.task.startedAt ?? prev.startedAt, detail: mergeDetail(prev.detail, d.task.detail, blocked),
  };
}

const count = async (db: Queryable, sql: string, id: string): Promise<number> => (await db.query<{ n: number }>(sql, [id])).rows[0]?.n ?? 0;

export async function pollProject(env: PollEnv, gl: GlProject): Promise<ProjectPoll> {
  const { port, db, cfg, now } = env;
  const { id, existing } = resolveProject(env.known, gl);
  const out: ProjectPoll = { id, gitlabId: gl.id, ok: true, tasks: 0, proofs: 0, ledger: 'skipped', issues: [] };
  const written: ProjectRow[] = [];
  try {
    // the tasks come out of this list, so it reaches back over the longer of the two windows (a BELAY_TASK_HOURS past 7
    // days); one reaching past 1970 reads from 1970, never from a date toISOString throws on
    const readBack = Math.max(cfg.rollupWindowMs, cfg.taskWindowMs);
    const mrs = await port.listMergeRequests(gl.id, { state: 'all', updatedAfter: new Date(Math.max(0, now.getTime() - readBack)).toISOString(), limit: cfg.mrLimit });
    // the port cuts the list at the limit without saying so: a full one may be missing MRs, tasks and roll-up counts included
    if (mrs.length >= cfg.mrLimit) out.issues.push(`${mrs.length} merge requests read, which is the mrLimit: any more updated in the window are not read`);
    const recent = mrs.filter((m) => Date.parse(m.updatedAt) >= now.getTime() - cfg.taskWindowMs);
    const deployments: GlDeployment[] = recent.length > 0 ? await port.listDeployments(gl.id, { limit: 30 }) : [];
    const derived: Array<{ d: TaskDerivation; blocked: boolean }> = [];
    const live = new Set(recent.map((m) => `${gl.id}!${m.iid}`));
    for (const key of env.mem.notes.keys()) if (key.startsWith(`${gl.id}!`) && !live.has(key)) env.mem.notes.delete(key); // left the window
    for (const mr of recent) {
      const d = deriveTask({ mr, notes: await notesOf(env, gl, mr), deployments }, id, cfg, env.trackOf);
      if (d) {
        derived.push({ d, blocked: mr.labels.includes('guardrail::block') });
        out.issues.push(...d.issues);
      }
    }
    await addMrFacts(port, env.mem, gl, recent, derived, out.issues); // each agent MR's size and head pipeline, onto its task's detail

    let ledgerError: string | null = null;
    if (env.ledger) {
      try {
        out.ledger = (await importLedger(env.ledger, db, gl.id, env.mem.ledger)).status;
      } catch (e) {
        out.ledger = 'rejected';
        ledgerError = messageOf(e);
      }
      try {
        out.cycles = (await importCycles(env.ledger, db, gl.id, id, env.mem.cycles)).status;
      } catch (e) {
        out.cycles = 'rejected';
        ledgerError ??= messageOf(e);
      }
    }
    const armed = await readArmed(port, env.mem, gl, out.issues); // null (and an issue) when it could not be read

    await db.transaction(async (tx) => {
      const base: ProjectRow = existing ?? {
        id, gitlabId: gl.id, name: gl.name, what: '', groupPath: groupPathOf(gl, env.group), state: 'watching', setupStep: null,
        ord: null, armed: null, webUrl: null, proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null,
      };
      await upsertProjects(tx, [{ ...base, gitlabId: gl.id, state: 'watching' }]);

      const rows: TaskRow[] = [];
      const proofs: Array<{ id: string; proof: TaskDerivation['proof'] }> = [];
      for (const { d, blocked } of derived) {
        const row = await mergeTask(tx, d, id, blocked, out.issues);
        if (!row) continue;
        rows.push(row);
        proofs.push({ id: row.id, proof: d.proof });
      }
      await upsertTasks(tx, rows); // before the proofs: proof.task_id references task
      for (const { id: taskId, proof } of proofs) {
        if (proof) await upsertProofs(tx, [proof]);
        else await deleteProofs(tx, taskId);
      }
      out.tasks = rows.length;
      out.proofs = proofs.filter((x) => x.proof !== null).length;

      const ledgerRead = out.ledger === 'imported' || out.ledger === 'unchanged'; // pollClasses after the tasks: its counters count this poll's merges
      const demotions = env.policy?.ok ? await pollClasses(tx, env.policy, id, gl.id, now, cfg.rollupWindowMs, ledgerRead, env.history, gl.webUrl || null) : base.demotions7d;

      const row: ProjectRow = {
        ...base, gitlabId: gl.id, state: 'watching', proofs7d: countProofs(mrs, now, cfg.rollupWindowMs), demotions7d: demotions,
        armed, webUrl: gl.webUrl || null, what: gl.description ?? '', last: await getLastTaskEvent(tx, id), // after the tasks
        needsYou: await countOpenInbox(tx, id),
        craOpen: await count(tx, "select count(*)::int as n from proposal where project_id = $1 and state = 'open' and kind = 'cra_signoff'", id),
      };
      await upsertProjects(tx, [row]);
      written.push(row);
    });
    // the targets after this one resolve their ids against what this one wrote
    env.known.splice(0, env.known.length, ...env.known.filter((k) => k.id !== id), ...written);

    await pollMaturityScan(port, db, env.mem, gl, id, out.issues, now); // after the project row: stage_cell references it
    if (ledgerError) throw new Error(ledgerError);
    await recordPollOk(db, projectSource(id), now);
  } catch (e) {
    out.ok = false;
    out.error = messageOf(e);
    await recordPollError(db, projectSource(id), out.error);
    if (existing || written.length > 0) await setProjectState(db, id, 'stale'); // a row this poll wrote too
  }
  return out;
}
