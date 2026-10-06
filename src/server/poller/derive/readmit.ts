// A class the tripwire quarantined waits for a person to re-admit it: Belay's own ask, derived from tier-state.yml.
// Proposals are matched by (kind, title), so one that is already in the inbox (seeded, or opened by an earlier poll)
// is never duplicated, and only the proposals this module opened are closed when the quarantine ends.
import type { ProposalRow } from '@/server/index/repositories/work/proposal';
import type { Quarantine } from './tiers';

const REASON: Record<string, string> = {
  guardrail_high: 'guardrail high severity',
  budget_breach_x2: 'budget breached twice',
  revert: 'a revert',
  reopened_finding: 'a reopened finding',
  post_merge_proof_fail: 'a post-merge proof failure',
  default_branch_red_1h: 'the default branch red for an hour',
};

export const READMIT_DOES = 'Re-admits at Assisted at most, never at its old tier.';
export const readmitId = (projectId: string, classId: string): string => `readmit:${projectId}:${classId}`;

export const readmitTitle = (q: Quarantine): string => `Re-admit ${q.track === null ? 'T?' : `T${q.track}`} ${q.role} · ${q.classId}`;

export function readmitProposal(projectId: string, q: Quarantine, now: Date): ProposalRow {
  const why = q.reason ? (REASON[q.reason] ?? q.reason) : 'a tripwire';
  return {
    id: readmitId(projectId, q.classId), projectId, kind: 'readmit', state: 'open', parentId: null, title: readmitTitle(q),
    subject: { reason: q.evidence ? `${why} on ${q.evidence}` : why, does: READMIT_DOES },
    dueAt: null, openedAt: q.since ?? now, actedAt: null, actedAs: null,
  };
}

export interface ReadmitPlan {
  open: ProposalRow[];
  /** Ids of this module's own open proposals whose quarantine has ended. */
  close: string[];
}

export function planReadmits(projectId: string, quarantines: readonly Quarantine[], openNow: readonly ProposalRow[], now: Date): ReadmitPlan {
  const have = new Set(openNow.filter((p) => p.kind === 'readmit').map((p) => p.title));
  const wanted = new Set(quarantines.map((q) => readmitTitle(q)));
  const open = quarantines.filter((q) => !have.has(readmitTitle(q))).map((q) => readmitProposal(projectId, q, now));
  const close = openNow.filter((p) => p.id.startsWith(`readmit:${projectId}:`) && !wanted.has(p.title)).map((p) => p.id);
  return { open, close };
}
