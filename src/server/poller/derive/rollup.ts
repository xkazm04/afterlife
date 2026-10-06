// The Fleet row's counters, derived from GitLab objects. NULL (unknown) is never turned into zero: a project whose MRs
// were not read keeps whatever the index had.
import type { ProofCounts } from '@/lib/demo/types';
import type { GlMergeRequest } from '@/server/gitlab/types';
import { parseLabels } from '../parse/labels';

/**
 * Proofs in the last `windowMs`, counted from the proof:: label of every MR updated in that window. updated_at stands in
 * for the proof's time (a later comment moves it), so the count can only drift toward "more recent than it was".
 */
export function countProofs(mrs: readonly GlMergeRequest[], now: Date, windowMs: number): ProofCounts {
  const since = now.getTime() - windowMs;
  const n: ProofCounts = { pass: 0, fail: 0, inconclusive: 0 };
  for (const mr of mrs) {
    if (Date.parse(mr.updatedAt) < since) continue;
    const { proof } = parseLabels(mr.labels);
    if (proof) n[proof] += 1;
  }
  return n;
}
