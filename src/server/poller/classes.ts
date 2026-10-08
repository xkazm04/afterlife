// One project's action classes in one poll: tier rows with their counters, then the asks they open (re-admits for a
// tripwire quarantine, promotions for a class Ladder's rule calls eligible). Runs inside the project's write transaction,
// after its tasks and ledger are in, so the counters see this poll's merges.
import { rulesOf } from '@/server/data/policy';
import { listClassTiers, upsertClassTiers } from '@/server/index/repositories/fleet/classTier';
import { readLedger } from '@/server/index/repositories/ledger/ledger';
import { listOpenProposals, upsertProposals, closeProposal } from '@/server/index/repositories/work/proposal';
import { listTasks } from '@/server/index/repositories/work/task';
import type { Queryable } from '@/server/index/repositories/sql';
import { demotesOnRevert } from './derive/counters';
import type { PolicyRead } from './derive/policy';
import { eligibleOf, planPromotions, type EligibleClass } from './derive/promotion';
import { planReadmits } from './derive/readmit';
import { deriveTiers, ROLE_TRACK } from './derive/tiers';

type Policy = Extract<PolicyRead, { ok: true }>;

/** When a person acted on (or dismissed) each of the project's re-admit and promotion asks. */
async function settledAsks(db: Queryable, projectId: string): Promise<Map<string, Date | null>> {
  const { rows } = await db.query<{ id: string; acted_at: Date | null }>(
    "select id, acted_at from proposal where project_id = $1 and state in ('acted', 'dismissed') and kind in ('readmit', 'promotion')",
    [projectId],
  );
  return new Map(rows.map((r) => [r.id, r.acted_at ? new Date(r.acted_at) : null]));
}

/** Writes the class tier rows and the asks; returns the demotions the tripwire wrote in the window. */
/** `ledgerRead`: this poll read the project's belay-ledger, so the events in the index are all it holds. */
export async function pollClasses(
  tx: Queryable, read: Policy, projectId: string, gitlabId: number, now: Date, windowMs: number, ledgerRead: boolean,
): Promise<number> {
  const { policy, state } = read;
  const prev = new Map((await listClassTiers(tx, projectId)).map((r) => [r.classId, r]));
  const events = await readLedger(tx, gitlabId);
  const counters = { tasks: await listTasks(tx, projectId), events, revertDemotes: demotesOnRevert(policy.demotion), ledgerRead };
  const t = deriveTiers(policy, state, projectId, now, prev, windowMs, counters);
  await upsertClassTiers(tx, t.rows);

  const open = await listOpenProposals(tx, projectId);
  const settled = await settledAsks(tx, projectId);
  const readmits = planReadmits(projectId, t.quarantines, open, now, settled);

  const rules = rulesOf(policy);
  const byId = new Map(t.rows.map((r) => [r.classId, r]));
  const eligible = [...t.held].flatMap(([id, record]): EligibleClass[] => {
    const row = byId.get(id);
    const c = policy.classes[id];
    if (!row || !c) return [];
    const e = eligibleOf({ row, record, role: c.agent, track: ROLE_TRACK[c.agent] ?? null, ceiling: c.ceiling, proof: c.proof ?? '' }, rules);
    return e ? [e] : [];
  });
  const promotions = planPromotions(projectId, eligible, new Map(t.rows.map((r) => [r.classId, r.since])), open, settled, now);

  await upsertProposals(tx, [...readmits.open, ...promotions.open]);
  for (const pid of [...readmits.close, ...promotions.close]) await closeProposal(tx, pid, 'expired', now, null);
  return t.demotions;
}
