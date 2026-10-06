// A tiny project factory for the model tests.
import type { FleetProject } from '@/lib/demo/types';

export function makeProject(over: Partial<FleetProject> & { id: string }): FleetProject {
  return {
    name: over.id,
    what: '',
    state: 'watching',
    armed: 4,
    tiers: { hands_off: 1, supervised: 1, assisted: 1, quarantined: 0, human_only: 1 },
    proofs7d: { pass: 3, fail: 0, inconclusive: 0 },
    demotions7d: 0,
    needsYou: 0,
    stages: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    feed: { ageSec: 10, ok: true },
    craOpen: 0,
    group: 'core',
    classTiers: {},
    ...over,
  };
}
