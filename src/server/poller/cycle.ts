// One poll cycle: the group's projects, the policy files, and every watched project. `runPollCycle(port, db, now)` takes
// its clock as an argument so a test (or the replay clock of the fake group) decides what "now" is.
import type { PGlite } from '@electric-sql/pglite';
import { readConfig } from '@/server/gitlab/config';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlProject } from '@/server/gitlab/types';
import type { LedgerSource } from '@/server/ledger/importLedger';
import { listGroups, listTrustClasses, upsertGroups, upsertTrustClasses } from '@/server/index/repositories/fleet/taxonomy';
import { listProjects, setProjectState } from '@/server/index/repositories/fleet/project';
import { getPairing, upsertPairing } from '@/server/index/repositories/pairing';
import { projectSource, recordPollError, recordPollOk } from '@/server/index/repositories/pollState';
import { readPollerConfig, type PollerConfig } from './config';
import type { EnginePolicy } from '../../../engine/policy/load';
import { readPolicy, type PolicyRead } from './derive/policy';
import { trustClassesOf } from './derive/tiers';
import { groupPathOf, pollProject, type ProjectPoll } from './project';
import { createMemory, type PollMemory } from './state';

export interface CycleResult {
  at: Date;
  ok: boolean;
  /** Set when the group itself could not be read. */
  error?: string;
  projects: ProjectPoll[];
  /** Things worth saying that are not failures: a missing policy file, a project without a ledger. */
  warnings: string[];
  /** trust-policy.yml as this cycle read it from belay-policy, when the engine's parser accepted it. */
  policy?: EnginePolicy;
}

export interface CycleOptions {
  cfg?: PollerConfig;
  mem?: PollMemory;
}

/** A group-level failure: every project polled before keeps its last good time and shows as stale. */
async function failGroup(db: PGlite, source: string, error: string): Promise<void> {
  await recordPollError(db, source, error);
  for (const p of (await listProjects(db)).filter((x) => x.gitlabId !== null)) {
    await recordPollError(db, projectSource(p.id), `the group could not be read: ${error}`);
    await setProjectState(db, p.id, 'stale');
  }
}

/** Existing class rows keep their order; classes new to the policy follow. */
async function syncClasses(db: PGlite, policy: PolicyRead): Promise<void> {
  if (!policy.ok) return;
  const have = await listTrustClasses(db);
  const wanted = trustClassesOf(policy.policy);
  const next = have.map((h) => ({ ...(wanted.find((w) => w.id === h.id) ?? h), ord: h.ord }));
  let ord = Math.max(-1, ...have.map((h) => h.ord)) + 1;
  for (const w of wanted) if (!have.some((h) => h.id === w.id)) next.push({ ...w, ord: ord++ });
  await upsertTrustClasses(db, next);
}

export async function runPollCycle(port: GitLabPort, db: PGlite, now: Date, opts: CycleOptions = {}): Promise<CycleResult> {
  const cfg = opts.cfg ?? readPollerConfig(readConfig().groupId);
  const mem = opts.mem ?? createMemory();
  const result: CycleResult = { at: now, ok: true, projects: [], warnings: [] };
  const source = `group:${cfg.group}`;

  let group;
  let all: GlProject[];
  try {
    [group, all] = await Promise.all([port.getGroup(cfg.group), port.listProjects(cfg.group)]);
  } catch (e) {
    result.ok = false;
    result.error = e instanceof Error ? e.message : String(e);
    await failGroup(db, source, result.error);
    return result;
  }

  // Only the group's own: belay-policy and belay-ledger at <group>/<name>, the files the gate reads, and targets under the
  // group's path. A subgroup's belay-policy, or a project shared in, is never read as the group's (F49).
  const own = (p: GlProject): boolean => p.pathWithNamespace.startsWith(`${group.fullPath}/`);
  const policyProject = all.find((p) => p.pathWithNamespace === `${group.fullPath}/${cfg.policyProject}`);
  const ledgerProject = all.find((p) => p.pathWithNamespace === `${group.fullPath}/${cfg.ledgerProject}`);
  all = all.filter(own);
  const targets = all.filter((p) => !p.archived && !cfg.infra.includes(p.path));
  let policy: PolicyRead | null = null;
  if (!policyProject) result.warnings.push(`no ${cfg.policyProject} project in the group: class tiers are not updated`);
  else {
    policy = await readPolicy(port, policyProject.id, cfg.policyRef).catch((e: unknown): PolicyRead => ({ ok: false, reason: e instanceof Error ? e.message : String(e) }));
    if (!policy.ok) result.warnings.push(`policy: ${policy.reason}; class tiers are not updated`);
    else result.policy = policy.policy;
  }
  const ledger: LedgerSource | null = ledgerProject ? { port, project: ledgerProject.id, ref: cfg.ledgerRef } : null;
  if (!ledger) result.warnings.push(`no ${cfg.ledgerProject} project in the group: the ledger is not imported`);

  const known = await listProjects(db);
  for (const gone of known.filter((k) => k.gitlabId !== null && !all.some((p) => p.id === k.gitlabId && !p.archived))) {
    await recordPollError(db, projectSource(gone.id), 'the project is no longer in the group (moved, archived or deleted)');
    await setProjectState(db, gone.id, 'stale');
  }
  await upsertGroups(db, [...new Set([...(await listGroups(db)), ...targets.map((p) => groupPathOf(p, group))])]);
  await syncClasses(db, policy ?? { ok: false, reason: '' });
  const classTrack = new Map((await listTrustClasses(db)).map((c) => [c.id, c.track]));
  const env = { port, db, cfg, now, mem, group, policy, ledger, known, trackOf: (cls: string) => classTrack.get(cls) ?? null };

  for (const gl of targets) {
    const r = await pollProject({ ...env, known: await listProjects(db) }, gl);
    result.projects.push(r);
    if (!r.ok) result.ok = false;
  }

  const prev = await getPairing(db, 'default');
  await upsertPairing(db, { id: 'default', gitlabHost: port.host ?? 'gitlab.com', groupPath: group.fullPath, checkoutPath: prev?.checkoutPath ?? null, pairedAt: prev?.pairedAt ?? now });
  await recordPollOk(db, source, now);
  return result;
}
