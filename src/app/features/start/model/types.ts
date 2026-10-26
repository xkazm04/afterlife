// /start's contracts: the wire from this machine to GitLab to Afterlife (moved from trace/model/types.ts), the probe
// stream, and the wizard's steps. Plain data: it crosses from the server to the screen.

export type NodeKey = 'glab' | 'login' | 'group' | 'live' | 'doctor' | 'setup';

/** pass: the probe saw it done. fail: the probe saw what blocks it. wait: an earlier node blocks it. unknown: not probed. */
export type NodeState = 'pass' | 'fail' | 'wait' | 'unknown';

export interface NodeRead {
  state: NodeState;
  /** What the probe saw, in its own words where it has them (the doctor's blocker text). */
  line: string;
}

export interface CapRow {
  id: string;
  label: string;
  status: 'available' | 'unavailable' | 'unknown';
  reason: string;
}

export interface TraceRead {
  /** When the probe ran, on this machine's clock ("14:22:05"). */
  at: string;
  nodes: Record<NodeKey, NodeRead>;
  /** The doctor's eleven rows; null when the probe did not get that far. */
  caps: CapRow[] | null;
  /** Which GitLab the probe read: this machine's glab login, or the seeded fake group. */
  source: 'glab' | 'fake';
}

/** What the server knows without probing: the environment the running server started with, and the live runtime. */
export interface TraceFacts {
  mode: 'demo' | 'live';
  fake: boolean;
  groupId: string;
  /** AFTERLIFE_GROUP_ID (or its pre-rename name, read by envOf) was set (otherwise the default group id is in use). */
  groupSet: boolean;
  host: string;
  /** Why Trace stands in for the app: live before the first poll, or a group with no project. */
  gate: 'not-ready' | 'empty' | null;
  /** The not-ready state shown on purpose (?rehearse=not-ready): the screen says so. */
  rehearsal: boolean;
  /** The live source's own reason, when it is not ready. */
  reason: string | null;
  /** Projects in the live snapshot; null when there is none (demo, or before the first poll). */
  projects: number | null;
}

/** /start's facts: Trace's, which name set each value (src/server/env sourceOf), and the server's platform (the install). */
export interface StartFacts extends TraceFacts {
  sources: Record<'group' | 'mode' | 'host', 'env' | 'setting' | 'unset'>;
  platform: 'windows' | 'macos' | 'linux';
}

export type ProbeAnswer ={ status: 'read'; read: TraceRead } | { status: 'refused'; reason: string };

/** GET /api/start/probe streams these, one JSON object per line (application/x-ndjson), in order. */
export type ProbeEvent =
  | { t: 'stage'; stage: 'preflight' | 'rows' }
  | { t: 'node'; key: NodeKey; read: NodeRead }
  | { t: 'cap'; row: CapRow }
  | { t: 'done'; read: TraceRead }
  | { t: 'refused'; reason: string };

/** The wizard's steps, in order. Derived from live state on every render, never stored. */
export type StepKey = 'repo' | 'glab' | 'login' | 'group' | 'live' | 'stack' | 'save' | 'unlock';
/** done: seen done. checking: a check is running now. blocked: a check saw what blocks it. todo: not reached. you: waits for a person (amber). */
export type StepState = 'done' | 'checking' | 'blocked' | 'todo' | 'you';
