// A cycle run, as the runner (runner/) appends it: one belay.run/0 event per line of
// .belay/runs/<repo>/<wave>.jsonl, append-only, never rewritten - so an event's ts is when it happened.
// Plain data, client-safe: /runs, Theater's live mode, Fleet and Needs-you read it through the DataSource.
// Absent values are OMITTED keys, never null or 0: a lane that never reported usage has no lane.usage event.

export const RUN_SCHEMA = 'belay.run/0' as const;

export type RunEventKind = 'wave.start' | 'wave.plan' | 'lane.start' | 'lane.usage' | 'lane.end' | 'wave.end';

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

/**
 * What the plan step answered, once per wave after wave.start (added later in belay.run/0: older files have none).
 * `raw` = lines of the planner's final message that looked like JSON; `parsed` = items that parsed and will run
 * (at most wave.start's `lanes`); `items` = their lane ids. `voided` says why a plan ran nothing regardless.
 */
export interface WavePlan extends RunEventBase {
  kind: 'wave.plan';
  raw: number;
  parsed: number;
  items: string[];
  voided?: 'timeout' | 'error' | 'dirty';
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
  /** claude's session id, so a lane's transcript can be found although every lane shares one worktree path. */
  sessionId?: string;
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
  /** Gates that went red and then green when rerun once (load flakes). Absent when none. */
  flaky?: string[];
  /** A red gate's whole output, relative to the runs dir (`<repo>/<wave>.<lane>.gate.log`). */
  gateLog?: string;
  wallSec: number;
}

export interface WaveEnd extends RunEventBase {
  kind: 'wave.end';
  /** `belay/wave-<n>`. */
  branch: string;
  mergeable: boolean;
  costUsd: number;
  /** False when nothing landed and the branch was deleted (`branch` then names one that does not exist). Absent in older files. */
  branchKept?: boolean;
  /** Setup or a gate was red on base before any lane ran: its reason and output tail. The wave planned nothing. */
  baseRed?: string;
  /** The red base gate's whole output, relative to the runs dir (`<repo>/<wave>.base.gate.log`). */
  gateLog?: string;
  /** Gates on base or on the wave branch that went red and then green when rerun once. Absent when none. */
  flaky?: string[];
}

export type RunEvent = WaveStart | WavePlan | LaneStart | LaneUsage | LaneEnd | WaveEnd;

export function waveBranch(wave: number): string {
  return `belay/wave-${wave}`;
}
