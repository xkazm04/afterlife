// GitLab labels that Belay's jobs set (docs/BACKEND-PLAN.md section 3): proof::*, guardrail::*, belay::tier::*.
// Conflicting labels resolve to the more restrictive reading, so a stray label can only make Belay more careful.
import { TIER_ORDER, type Tier } from '@/schemas/tier';
import type { Verdict } from '@/schemas/proof';

export interface LabelFacts {
  proof: Verdict | null;
  guardrail: 'pass' | 'block' | null;
  /** The tier the gate stamped on the MR. */
  tier: Tier | null;
}

const PROOF_RANK: Record<Verdict, number> = { pass: 0, inconclusive: 1, fail: 2 };

export function parseLabels(labels: readonly string[]): LabelFacts {
  let proof: Verdict | null = null;
  let guardrail: LabelFacts['guardrail'] = null;
  let tier: Tier | null = null;
  for (const l of labels) {
    const [scope, ...rest] = l.split('::');
    const value = rest.join('::');
    if (scope === 'proof' && (value === 'pass' || value === 'fail' || value === 'inconclusive')) {
      if (proof === null || PROOF_RANK[value] > PROOF_RANK[proof]) proof = value;
    } else if (scope === 'guardrail' && (value === 'pass' || value === 'block')) {
      if (guardrail !== 'block') guardrail = value;
    } else if (scope === 'belay' && value.startsWith('tier::')) {
      const t = value.slice('tier::'.length);
      const known = TIER_ORDER.find((x) => x === t);
      if (known && (tier === null || TIER_ORDER.indexOf(known) < TIER_ORDER.indexOf(tier))) tier = known;
    }
  }
  return { proof, guardrail, tier };
}
