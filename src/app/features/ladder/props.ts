// What the Ladder route hands the screen (data/loadLadderData.ts builds it on the server).
import type { PolicyRules, TiersStale } from '@/server/data/types';
import type { LadderSeed } from './model/state/state';
import type { Ceiling, Track } from './model/types';

export interface LadderScreenProps {
  /** The project the classes belong to: the id the server actions plan the writes for. */
  project: string;
  seed: LadderSeed;
  tracks: readonly Track[];
  /** What each tier means, for the legend. */
  means: Readonly<Record<Ceiling, string>>;
  /** trust-policy.yml's rules, as the server read them: the promotion thresholds. Null: not read. */
  policy: PolicyRules | null;
  /** Live: the last poll could not read belay-policy, so the class tiers are stale (the reason); null otherwise. */
  tiersStale: TiersStale | null;
  /** The demo's own text shown beside live data, to mark: the opening belay-policy history. */
  illustrative: { history: boolean };
  /** Live mode: the wall clock and a poll age that counts up (demo: the simulated clock). */
  live: boolean;
  /** How old the last poll was when the screen opened, in seconds. */
  feedAgeSec: number;
  /** "acme-lab / ledgerline". */
  subtitle: string;
}
