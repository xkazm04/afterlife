// One poll of one project: read GitLab (MRs, notes, deployments, the ledger), then write every derived row in one
// transaction. Reads come first, so a failed read writes nothing and the project keeps its last good rows.
import type { PGlite } from '@electric-sql/pglite';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlDeployment, GlGroup, GlMergeRequest, GlNote, GlProject } from '@/server/gitlab/types';
import { importLedger, type LedgerSource } from '@/server/ledger/importLedger';
import { importCycles } from '@/server/ledger/importCycles';
import { listClassTiers, upsertClassTiers } from '@/server/index/repositories/fleet/classTier';
import { upsertProjects, type ProjectRow } from '@/server/index/repositories/fleet/project';
import { listOpenProposals, upsertProposals, closeProposal } from '@/server/index/repositories/work/proposal';
import { deleteProofs, upsertProofs } from '@/server/index/repositories/work/proof';
import { getTaskRow, upsertTasks, type TaskDetail, type TaskRow } from '@/server/index/repositories/work/task';
import { recordPollError, recordPollOk, projectSource } from '@/server/index/repositories/pollState';
import { setProjectState } from '@/server/index/repositories/fleet/project';
import type { Queryable } from '@/server/index/repositories/sql';
import type { PollerConfig } from './config';
import { deriveTask, type TaskDerivation } from './derive/task';
import { deriveTiers } from './derive/tiers';
import { planReadmits } from './derive/readmit';
import { countProofs } from './derive/rollup';
import type { PolicyRead } from './derive/policy';
import type { PollMemory } from './state';

export interface PollEnv {
  port: GitLabPort;
  db: PGlite;
  cfg: PollerConfig;
  now: Date;
  mem: PollMemory;
  group: GlGroup;
  policy: PolicyRead | null;
  ledger: LedgerSource | null;
  /** The index's projects before this cycle. */
  known: readonly ProjectRow[];
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
  try {
    const mrs = await port.listMergeRequests(gl.id, { state: 'all', updatedAfter: new Date(now.getTime() - cfg.rollupWindowMs).toISOString(), limit: cfg.mrLimit });
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

    let ledgerError: string | null = null;
    if (env.ledger) {
      try {
        out.ledger = (await importLedger(env.ledger, db, gl.id, env.mem.ledger)).status;
      } catch (e) {
        out.ledger = 'rejected';
        ledgerError = e instanceof Error ? e.message : String(e);
      }
      try {
        out.cycles = (await importCycles(env.ledger, db, gl.id, env.mem.cycles)).status;
      } catch (e) {
        out.cycles = 'rejected';
        ledgerError ??= e instanceof Error ? e.message : String(e);
      }
    }

    await db.transaction(async (tx) => {
      const base: ProjectRow = existing ?? {
        id, gitlabId: gl.id, name: gl.name, what: '', groupPath: groupPathOf(gl, env.group), state: 'watching', setupStep: null,
        ord: null, armed: 0, proofs7d: null, demotions7d: null, needsYou: 0, craOpen: 0, envStaging: null, envProduction: null, last: null,
      };
      await upsertProjects(tx, [{ ...base, gitlabId: gl.id, state: 'watching' }]);

      let demotions = base.demotions7d;
      if (env.policy?.ok) {
        const prev = new Map((await listClassTiers(tx, id)).map((r) => [r.classId, r]));
        const t = deriveTiers(env.policy.policy, env.policy.state, id, now, prev, cfg.rollupWindowMs);
        await upsertClassTiers(tx, t.rows);
        demotions = t.demotions;
        const open = await listOpenProposals(tx, id);
        const plan = planReadmits(id, t.quarantines, open, now);
        await upsertProposals(tx, plan.open);
        for (const pid of plan.close) await closeProposal(tx, pid, 'expired', now, null);
      }

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

      await upsertProjects(tx, [{
        ...base, gitlabId: gl.id, state: 'watching', proofs7d: countProofs(mrs, now, cfg.rollupWindowMs), demotions7d: demotions,
        needsYou: await count(tx, "select count(*)::int as n from proposal where project_id = $1 and state = 'open' and parent_id is null", id),
        craOpen: await count(tx, "select count(*)::int as n from proposal where project_id = $1 and state = 'open' and kind = 'cra_signoff'", id),
      }]);
    });

    if (ledgerError) throw new Error(ledgerError);
    await recordPollOk(db, projectSource(id), now);
  } catch (e) {
    out.ok = false;
    out.error = e instanceof Error ? e.message : String(e);
    await recordPollError(db, projectSource(id), out.error);
    if (existing) await setProjectState(db, id, 'stale');
  }
  return out;
}
