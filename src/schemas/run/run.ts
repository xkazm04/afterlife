// A cycle run, as the runner (runner/) appends it: one belay.run/0 event per line of
// .belay/runs/<repo>/<wave>.jsonl, append-only, never rewritten - so an event's ts is when it happened.
// Plain data, client-safe: /runs, Theater's live mode, Fleet and Needs-you read it through the DataSource.
// Absent values are OMITTED keys, never null or 0: a lane that never reported usage has no lane.usage event.

export const RUN_SCHEMA = 'belay.run/0' as const;

export type RunEventKind = 'wave.start' | 'lane.start' | 'lane.usage' | 'lane.end' | 'wave.end';

/** How a lane ended. `budget` = halted at laneCapUsd or waveCapUsd; `timeout` = its process tree was killed. */
export type LaneOutcome = 'landed' | 'parked' | 'failed' | 'budget' | 'timeout';

interface RunEventBase {
  v: typeof RUN_SCHEMA;
  ts: string;
  /** The fleet slug from .belay/fleet.yml. */
  repo: string;
  wave: number;
  /** First 12 hex of sha256 over runner/prompts/{plan,lane,reflect}.md. */
  promptVersion: string;
}

export interface WaveStart extends RunEventBase {
  kind: 'wave.start';
  base: string;
  lanes: number;
  laneCapUsd: number;
  waveCapUsd: number;
  model: string;
}

export interface LaneStart extends RunEventBase {
  kind: 'lane.start';
  lane: string;
  /** The item the lane works, in the plan's words. */
  title: string;
}

export interface LaneUsage extends RunEventBase {
  kind: 'lane.usage';
  lane: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
}

export interface LaneEnd extends RunEventBase {
  kind: 'lane.end';
  lane: string;
  outcome: LaneOutcome;
  commits: string[];
  /** Why it did not land; a red gate's reason is its summary line, then the tail of that gate's output. */
  parkReason?: string;
  /** A lane that changed files and did not land: its diff against base, relative to the runs dir (`<repo>/<wave>.<lane>.patch`). */
  patch?: string;
  wallSec: number;
}

export interface WaveEnd extends RunEventBase {
  kind: 'wave.end';
  /** `belay/wave-<n>`. */
  branch: string;
  mergeable: boolean;
  costUsd: number;
}

export type RunEvent = WaveStart | LaneStart | LaneUsage | LaneEnd | WaveEnd;

export function waveBranch(wave: number): string {
  return `belay/wave-${wave}`;
}
