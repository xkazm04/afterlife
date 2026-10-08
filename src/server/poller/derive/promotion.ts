// A class whose counters meet trust-policy.yml's promotion rule waits for a person to promote it: Belay's own ask, as
// re-admits are (./readmit.ts). Eligibility is the rule Ladder's Promote reads (promotion() in src/lib/promotion), on the
// row the poll just wrote, so Ladder's Promote and this ask can never disagree. Proposals are matched by (kind, title): a
// seeded or earlier one is never duplicated, and only this module's own are refreshed or closed.
import { promotion, promotionId, type PromotionRule } from '@/lib/promotion';
import type { Ceiling, Tier } from '@/schemas/tier';
import type { PolicyRules } from '@/server/data/types';
import type { ClassTierRow } from '@/server/index/repositories/fleet/classTier';
import type { ClassCounters } from './counters';
import type { ProposalRow } from '@/server/index/repositories/work/proposal';
import { shownOf } from '@/server/index/views/standing';

export const PROMOTE_DOES = 'Opens a policy MR in belay-policy that raises the record one tier. You merge it in GitLab; Belay never does.';

/** A class one agent holds, as this poll wrote it, with what trust-policy.yml says of it. */
export interface PromotionCandidate {
  row: ClassTierRow;
  /** Its counters, counted this poll (./counters.ts). */
  record: ClassCounters;
  role: string;
  track: number | null;
  ceiling: Ceiling;
  /** The class's proof class in trust-policy.yml ('' when it names none). */
  proof: string;
}

export interface EligibleClass {
  classId: string;
  title: string;
  from: Tier;
  to: Tier;
  rules: PromotionRule[];
}

/** "Promote T1 patcher · dep-bump.patch", the desk's form. */
export const promotionTitle = (track: number | null, role: string, classId: string): string =>
  `Promote ${track === null ? 'T?' : `T${track}`} ${role} · ${classId}`;

/**
 * The class, when Ladder's rule calls it eligible against these thresholds at `now`: a record whose cooldown_until is
 * still ahead is not (the rule's cooldown row), so no ask opens before that date.
 */
export function eligibleOf(c: PromotionCandidate, rules: PolicyRules | null, now: Date = new Date()): EligibleClass | null {
  const { row } = c;
  if (row.tier === null || row.tier === 'human_only') return null;
  const shown = shownOf(row);
  const cooldownUntil = row.cooldownUntil?.toISOString() ?? null;
  const p = promotion({ tier: row.tier, ceiling: c.ceiling, record: c.record, cell: shown.cell, holders: shown.holders ?? undefined, cooldownUntil }, c.proof, rules, now);
  if (p.kind !== 'eligible') return null;
  return { classId: row.classId, title: promotionTitle(c.track, c.role, row.classId), from: row.tier, to: p.next, rules: p.rules };
}

export function promotionProposal(projectId: string, e: EligibleClass, openedAt: Date): ProposalRow {
  return {
    id: promotionId(projectId, e.classId), projectId, kind: 'promotion', state: 'open', parentId: null, title: e.title,
    subject: { from: e.from, to: e.to, rules: e.rules.map((r) => [r.name, r.value, r.met]), does: PROMOTE_DOES },
    dueAt: null, openedAt, actedAt: null, actedAs: null,
  };
}

export interface PromotionPlan {
  /** New asks, and this module's open ones with their counts refreshed. */
  open: ProposalRow[];
  /** Ids of this module's own open proposals whose class is no longer eligible. */
  close: string[];
}

/**
 * `settled`: when a person acted on (or dismissed) each of this project's asks, by id. An ask settled at or after the
 * record's since is not opened again: its MR is the person's to merge, and it comes back only once the record moves.
 */
export function planPromotions(
  projectId: string, eligible: readonly EligibleClass[], sinceOf: ReadonlyMap<string, Date | null>, openNow: readonly ProposalRow[],
  settled: ReadonlyMap<string, Date | null>, now: Date,
): PromotionPlan {
  const own = (p: ProposalRow) => p.id.startsWith(`promote:${projectId}:`);
  const open = openNow.filter((p) => p.kind === 'promotion');
  const byTitle = new Map(open.map((p) => [p.title, p]));
  const out: ProposalRow[] = [];
  for (const e of eligible) {
    const have = byTitle.get(e.title);
    if (have) {
      if (own(have)) out.push(promotionProposal(projectId, e, have.openedAt));
      continue;
    }
    const id = promotionId(projectId, e.classId);
    if (isSettled(settled.get(id), sinceOf.get(e.classId) ?? null, settled.has(id))) continue;
    out.push(promotionProposal(projectId, e, now));
  }
  const wanted = new Set(eligible.map((e) => e.title));
  return { open: out, close: open.filter((p) => own(p) && !wanted.has(p.title)).map((p) => p.id) };
}

/** A person settled the ask at or after the record's since (or when either time is unknown). */
export function isSettled(actedAt: Date | null | undefined, since: Date | null, known: boolean): boolean {
  if (!known) return false;
  if (!actedAt || !since) return true;
  return actedAt.getTime() >= since.getTime();
}
