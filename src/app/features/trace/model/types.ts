// Trace's contracts: the wire from this machine to GitLab to Afterlife, as six nodes, and what a probe saw at each.
// Plain data: it crosses from the server (the probe action) to the screen.

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
  /** BELAY_GROUP_ID was set (otherwise the default group id is in use). */
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

export type ProbeAnswer = { status: 'read'; read: TraceRead } | { status: 'refused'; reason: string };
