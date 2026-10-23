// What Fleet and Needs-you show of the runner: the fleet file's repos beside their runs, and the decisions the runs
// leave for a person (a mergeable wave not yet in its base, a lane that parked). Plain, client-safe data; absent stays
// an omitted key, never 0.
import type { OutcomeCounts } from '../types';

/** One repo of .belay/fleet.yml, as far as the screens need it (the gates and caps are the runner's). */
export interface FleetRef {
  slug: string;
  path: string;
  base: string;
  /** The repo's GitLab path_with_namespace (fleet.yml `gitlab`), for the Fleet cost join; absent: not stated. */
  gitlab?: string;
}

/** What git says of a wave branch in its repo. Unknown (no path, git failed) is an absent entry, not a guess. */
export interface BranchState {
  exists: boolean;
  /** The branch's head is an ancestor of the base: it is in. */
  merged: boolean;
}

export type FleetFile = 'ok' | 'missing' | 'invalid';

export interface MergeNeed {
  kind: 'merge-wave';
  id: string;
  repo: string;
  wave: number;
  branch: string;
  base: string;
  /** Absent when the repo is not in the fleet file: the commands then name the slug and say so. */
  path?: string;
  landed: number;
  costUsd?: number;
  /** False when git could not be asked: the card says the state is unchecked. */
  checked: boolean;
  commands: string[];
}

export interface ParkNeed {
  kind: 'parked-lane';
  id: string;
  repo: string;
  wave: number;
  lane: string;
  title?: string;
  parkReason?: string;
}

export type RunnerNeed = MergeNeed | ParkNeed;

export interface RunnerRow {
  slug: string;
  /** From the fleet file; absent for a repo that has runs but is no longer listed. */
  path?: string;
  base?: string;
  /** The fleet file's `gitlab` key for this repo; absent: not stated (join.ts then matches by slug). */
  gitlab?: string;
  inFleet: boolean;
  waves: number;
  last?: { wave: number; running: boolean; mergeable?: boolean; merged?: boolean; counts: OutcomeCounts; open: number; endedAt?: string };
  tokens?: number;
  costUsd?: number;
  /** Runner decisions waiting on this repo. */
  needs: number;
}

export interface RunnerDesk {
  fleet: FleetFile;
  /** Why the fleet file did not read, in its own words. */
  fleetError?: string;
  rows: RunnerRow[];
  needs: RunnerNeed[];
}
