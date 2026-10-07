// Types for the Task screen: the typed fixtures (TaskDetail) and the merged view model (TaskView).
import type { Task, TierKey } from '@/lib/demo';
import type { Check } from '@/schemas';

/** The stored proof verdict, word for word. INCONCLUSIVE and UNKNOWN (no verdict stored) are never a pass. */
export type Verdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'UNKNOWN';
/** true holds, false fails, null = could not be machine-checked (a person decides; never a pass). */
export type CheckResult = boolean | null;
export type CheckKind = 'ok' | 'bad' | 'unk';

/** [ledger seq, time, kind, text]. The hashes are derived when the view is built. */
export type LedgerSeed = readonly [seq: number, at: string, kind: string, text: string];

export interface ChainSeed {
  step: string;
  obj: string | null;
  at: string | null;
}

export interface CheckSeed {
  id: string;
  text: string;
  ok: CheckResult;
  /** 'human': a person decides it (a struck term, ignored by the verdict). Default 'engine'. */
  decidedBy?: Check['decidedBy'];
  ref: string;
}

export interface ProofSeed {
  cls: string;
  verdict: Verdict;
  engine: string;
  digest: string;
  checks: CheckSeed[];
}

export interface Envelope {
  files: number;
  lines: number;
  paths: string[];
  within: boolean;
}

export interface Hunk {
  file: string;
  head: string;
  lines: (readonly [mark: ' ' | '+', text: string])[];
}

/**
 * What the Task screen adds to (or, for three tasks, supplies instead of) the demo dataset. `checkMap` maps a check id to
 * [the claims it tests, the 0-based chain link its evidence comes from]. ILLUSTRATIVE.
 */
export interface TaskDetail {
  /** Tasks the demo dataset has no row for carry their own base row. */
  local?: Task;
  seeded?: boolean;
  agent: string;
  flowRun: string;
  claimIds: string[];
  claims?: string[];
  chain?: ChainSeed[];
  chainRefs: (string | null)[];
  proof?: ProofSeed;
  checkMap: Record<string, readonly [claims: string[], link: number]>;
  envelope: Envelope;
  hunk?: Hunk;
  agentWords?: string;
  countsToward?: string;
  awareAt?: string;
  ledger: LedgerSeed[];
  trace: string[];
}

export interface ChainLink {
  step: string;
  obj: string | null;
  at: string | null;
  ref: string | null;
  /** Not reached: nothing shipped. Drawn dashed. */
  na: boolean;
}

export interface TaskCheck extends CheckSeed {
  /** Claim ids this check tests; empty = an engine invariant. */
  claims: string[];
  /** 0-based chain link the evidence comes from. */
  link: number;
}

export interface TaskClaim {
  id: string;
  /** Written by the agent: untrusted, never a term of the verdict. */
  text: string;
  /** Ids of the checks that test it; empty = untested, no weight. */
  checks: string[];
}

export interface LedgerRow {
  seq: number;
  at: string;
  kind: string;
  text: string;
  prev: string;
  hash: string;
}

export interface TaskView {
  id: string;
  track: string;
  trackName: string;
  cls: string;
  mr: string | null;
  title: string;
  tierAtTime: TierKey;
  /** Today's tier for the class; null when the class is unknown. */
  tierNow: TierKey | null;
  state: string;
  seeded: boolean;
  agent: string;
  flowRun: string;
  chain: ChainLink[];
  claims: TaskClaim[];
  proof: { cls: string; verdict: Verdict; engine: string; digest: string; checks: TaskCheck[] };
  agentWords: string;
  countsToward: string;
  envelope: Envelope;
  hunk: Hunk | null;
  stats: Task['stats'] | null;
  clock: Task['clock'] | null;
  grade: string | null;
  linksResolved: number[] | null;
  awareAt: string | null;
  ledger: LedgerRow[];
  trace: string[];
}
