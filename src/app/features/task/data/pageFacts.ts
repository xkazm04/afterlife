// Facts the prototype hard-codes for the whole page. Illustrative demo data.
export const PAGE_NOW = '14:22';
export const LEDGER_AGE_SEC = 12;
export const POLICY_SHA = 'a1b2c3';

export const PROOF_CLASSES = ['exploit-test', 'cited-diff', 'bench-delta', 'rerun-stats', 'linked-evidence', 'repro', 'score-delta'] as const;

export const PROOF_CLASS_MEANS: Record<string, string> = {
  'exploit-test': 'red at base, green at head, same test id; scope; finding closed on rescan',
  'cited-diff': 'every finding quotes a hunk; the quote must exist in the diff',
  'bench-delta': 'tests green, benchmark inside budget, each changelog claim links to upstream',
  'rerun-stats': 'N reruns of the same SHA, counts recomputed from the job API',
  'linked-evidence': 'every statement links to a GitLab object that resolves; clock recomputed',
  repro: 'steps replayed by a scripted browser; screenshot hash; re-check after next push',
  'score-delta': 'before and after scans by the same engine; lift outside the noise band',
};
