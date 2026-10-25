// The three re-measures of a claim and the verdict they share. Afterlife's own numbers only: the agent's figure on a
// claim is never read here (the agent-value test under __tests__ greps for it).
//   passiveMeasure  the natural runs of the claim's variant before and after its change (passive.ts)
//   queuedMeasure   exactly the runs the queue-runs write queued, once a collect stored them (queued.ts)
//   localMeasure    the runner's T3 measurement of a frontier metric on base and on the change (local.ts)
import { loadProjects } from '@/server/discover';
import { gitAncestor, passiveWith, type MeasureAnswer } from './passive';

export { judge, judgeSamples, sampleOf, toleranceOf, MIN_WALL_SAMPLES, type Judged } from './judge';
export { localMeasure, defaultBranch, type LocalDeps, type MeasureTech } from './local';
export { appendQueued, measureQueuedAll, queuedMeasure, readQueued, type QueuedBatch } from './queued';
export { passiveWith, type MeasureAnswer } from './passive';

/** The claim's variant's N runs before its change against the first N after; "waiting: k of N after" until both have 3. */
export function passiveMeasure(slug: string, claimId: string, n = 5): Promise<MeasureAnswer> {
  const cfg = loadProjects().find((p) => p.slug === slug);
  if (!cfg) return Promise.resolve({ status: 'refused', reason: `no onboarded project "${slug}"` });
  return passiveWith(slug, claimId, n, { isAncestor: gitAncestor(cfg.root), rules: cfg.ci.variants });
}
