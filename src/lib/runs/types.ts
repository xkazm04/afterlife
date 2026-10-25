// What /runs shows: the belay.run/0 files folded into plain, client-safe data (the server reads them, the screen draws
// them). An absent value is an OMITTED key, never 0 or null: a lane that never reported usage has no tokens and no cost.
import type { LaneOutcome } from '@/schemas/run/run';

export interface RunLane {
  lane: string;
  title?: string;
  /** Absent while the lane is still running (no lane.end yet). */
  outcome?: LaneOutcome;
  commits?: string[];
  parkReason?: string;
  wallSec?: number;
  /** Input + output + cache read + cache write, summed over the lane's usage events. */
  tokens?: number;
  costUsd?: number;
  /** The model of the lane's last usage event. */
  model?: string;
  promptVersion: string;
}

export type OutcomeCounts = Record<LaneOutcome, number>;

export interface RunWave {
  repo: string;
  wave: number;
  lanes: RunLane[];
  /** Lanes with no lane.end yet. */
  open: number;
  counts: OutcomeCounts;
  tokens?: number;
  /** wave.end's own figure, else the sum of the lanes that reported one. */
  costUsd?: number;
  branch?: string;
  mergeable?: boolean;
  startedAt?: string;
  endedAt?: string;
  /** wave.start seen, wave.end not. */
  running: boolean;
  promptVersion?: string;
  model?: string;
  /** `<wave>.proposals.md` sits next to the events. */
  hasProposals: boolean;
  /** A propose-only wave (`--mode propose`): the plan ran and no lane did. Its `proposed` items are not parked or failed. */
  proposeOnly?: true;
  /** A propose-only wave's planned lane ids, from wave.plan (the full items are `<wave>.proposed.jsonl`). */
  proposed?: string[];
  /** wave.start's `onto`: `branch` is an existing branch the run landed on, not a `belay/wave-<n>` it made. */
  onto?: true;
}

export interface RunTotals {
  waves: number;
  lanes: number;
  counts: OutcomeCounts;
  /** landed / lanes that ended; absent while none has. */
  landedPct?: number;
  tokens?: number;
  costUsd?: number;
}

export interface RunRepo {
  repo: string;
  /** Newest wave first. */
  waves: RunWave[];
  totals: RunTotals;
}

export interface RunsData {
  repos: RunRepo[];
  totals: RunTotals;
  /** Lines that were not a belay.run/0 event: counted, never shown as runs. */
  skippedLines: number;
}
