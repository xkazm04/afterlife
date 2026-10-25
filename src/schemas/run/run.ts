// A cycle run, as the runner (runner/) appends it: one belay.run/0 event per line of
// .belay/runs/<repo>/<wave>.jsonl, append-only, never rewritten - so an event's ts is when it happened.
// Plain data, client-safe: /runs, Theater's live mode, Fleet and Needs-you read it through the DataSource.
// Absent values are OMITTED keys, never null or 0: a lane that never reported usage has no lane.usage event.

export const RUN_SCHEMA = 'belay.run/0' as const;

/** Every event kind, at runtime: the reader's allow-list is this, not a copy of it. */
export const RUN_EVENT_KINDS = ['wave.start', 'wave.plan', 'lane.start', 'lane.usage', 'lane.end', 'wave.tech', 'wave.end'] as const;
export type RunEventKind = (typeof RUN_EVENT_KINDS)[number];

/** How a lane ended. `budget` = halted at laneCapUsd or waveCapUsd; `timeout` = its process tree was killed. */
export const LANE_OUTCOMES = ['landed', 'parked', 'failed', 'budget', 'timeout'] as const;
export type LaneOutcome = (typeof LANE_OUTCOMES)[number];

interface RunEventBase {
  v: typeof RUN_SCHEMA;
  ts: string;
  /** The fleet slug from .belay/fleet.yml. */
  repo: string;
  wave: number;
  /** First 12 hex of sha256 over runner/prompts/{plan,lane,reflect,review,repair,frontier}.md (older files: the first three). */
  promptVersion: string;
}

export interface WaveStart extends RunEventBase {
  kind: 'wave.start';
  base: string;
  lanes: number;
  laneCapUsd: number;
  waveCapUsd: number;
  model: string;
  /** The branch lanes land on (added later; absent in older files): `belay/wave-<n>`, or the existing `--onto` branch. */
  branch?: string;
  /** A propose-only wave (`--mode propose`): the plan ran, nothing else did. Absent = execute. */
  mode?: 'propose';
  /** `branch` is an existing branch the run was told to land on (`--onto`): never created, never deleted. */
  onto?: true;
}

/** Where a plan's evidence came from: the engine's checkout scan, or the repo's lens-scan store (`--ideas`). */
export const IDEA_SOURCES = ['scan', 'lens-scan'] as const;
export type IdeaSource = (typeof IDEA_SOURCES)[number];

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
  /** The axes the planner searched and found nothing on, from its `{"empty":[...]}` line. */
  empty?: string[];
  /** Craft axes with neither a lane nor an empty entry: never searched. Absent when the plan covered all seven. */
  uncovered?: string[];
  voided?: 'timeout' | 'error' | 'dirty';
  /** The shortcomings the plan prompt was shown, per source (`--ideas`, added later). Absent when none was asked for. */
  ideas?: { source: IdeaSource; count: number }[];
}

export interface LaneStart extends RunEventBase {
  kind: 'lane.start';
  lane: string;
  /** The item the lane works, in the plan's words. */
  title: string;
  /** A frontier lane: no plan item, it works the repo's fleet `frontier.objective` (added later; absent otherwise). */
  frontier?: true;
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
  /**
   * Which of the lane's calls this is when it is not the lane's own session (added later; absent = the lane call):
   * `review` = the fresh read-only review of its change, `repair` = its one repair turn. Both count against the lane cap.
   */
  call?: 'review' | 'repair';
  costUsd: number;
}

export interface LaneEnd extends RunEventBase {
  kind: 'lane.end';
  lane: string;
  outcome: LaneOutcome;
  commits: string[];
  /** Why it did not land; a red gate's reason is its summary line, then the tail of that gate's output. */
  parkReason?: string;
  /** The lane's own DONE line (what changed, follow-ups it saw), at most 400 characters. */
  done?: string;
  /** A lane that changed files and did not land: its diff against base, relative to the runs dir (`<repo>/<wave>.<lane>.patch`). */
  patch?: string;
  /** Gates that went red and then green when rerun once (load flakes). Absent when none. */
  flaky?: string[];
  /** A red or flaky gate's whole output, every run, relative to the runs dir (`<repo>/<wave>.<lane>.gate.log`). */
  gateLog?: string;
  /** The read-only review of a DONE lane (added later): `clean`, `defects` (a repair turn ran) or `unread` (no verdict). */
  review?: 'clean' | 'defects' | 'unread';
  /** Existing test files or fixtures the lane changed beyond a mechanical edit, put back to base before the review. */
  restored?: string[];
  wallSec: number;
}

/** One technology metric of a fleet repo's `frontier`, measured on the wave base and on the wave tip. */
export interface TechMetricDelta {
  name: string;
  /** The metric's unit (`s`, `bytes`, ...), as the fleet file states it. */
  unit: string;
  /** Mean over the runs that gave a value; absent when none did (a red command, a missing file). */
  before?: number;
  after?: number;
  /** (after - before) / before, signed so that positive is always better (the metric's direction). */
  gain?: number;
  threshold: number;
  /** gain >= threshold. */
  breakthrough: boolean;
  /** Either side's spread over its runs ((max - min) / mean) is at or above the threshold: not evidence either way. */
  noisy: boolean;
}

/**
 * T3 measurement (added later in belay.run/0): a repo with a fleet `frontier` whose wave landed something has its
 * metrics measured in a throwaway worktree on the wave base (`from`) and on the wave tip (`to`), before wave.end.
 */
export interface WaveTech extends RunEventBase {
  kind: 'wave.tech';
  from: string;
  to: string;
  metrics: TechMetricDelta[];
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
  /** The base gate's output when red (`<repo>/<wave>.base.gate.log`), or the wave gate's when red or flaky (`<repo>/<wave>.wave.gate.log`), relative to the runs dir. */
  gateLog?: string;
  /** Gates on base or on the wave branch that went red and then green when rerun once. Absent when none. */
  flaky?: string[];
  /** A propose-only wave: the plan's items are the proposal; no lane ran, so `landed` is 0 and no branch was made. */
  proposeOnly?: true;
  /** How many lanes landed on `branch` (added later; absent in older files). 0 in a propose-only wave. */
  landed?: number;
}

export type RunEvent = WaveStart | WavePlan | LaneStart | LaneUsage | LaneEnd | WaveTech | WaveEnd;
// RUN_EVENT_KINDS names exactly the kinds RunEvent has: a kind added to one and not the other is a typecheck error.
const KINDS_MATCH: [RunEventKind, RunEvent['kind']] extends [RunEvent['kind'], RunEventKind] ? true : never = true;
void KINDS_MATCH;

export function waveBranch(wave: number): string {
  return `belay/wave-${wave}`;
}
