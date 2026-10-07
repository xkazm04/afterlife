// A tiny project factory for the model tests. Its class cells follow its tier counts (one class per counted tier), so
// its tiers are known; pass `classTiers: {}` for a project whose tiers are unknown.
import type { FleetProject, TierCounts } from '@/lib/demo/types';

const cellsOf = (t: TierCounts): FleetProject['classTiers'] =>
  Object.fromEntries(Object.entries(t).flatMap(([tier, n]) => Array.from({ length: n }, (_, i) => [`${tier}.${i}`, tier as keyof TierCounts])));

export function makeProject(over: Partial<FleetProject> & { id: string }): FleetProject {
  const tiers = over.tiers ?? { hands_off: 1, supervised: 1, assisted: 1, quarantined: 0, human_only: 1 };
  return {
    name: over.id,
    what: '',
    state: 'watching',
    armed: 4,
    tiers,
    proofs7d: { pass: 3, fail: 0, inconclusive: 0 },
    demotions7d: 0,
    needsYou: 0,
    stages: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    feed: { ageSec: 10, ok: true },
    craOpen: 0,
    group: 'core',
    classTiers: cellsOf(tiers),
    ...over,
  };
}
