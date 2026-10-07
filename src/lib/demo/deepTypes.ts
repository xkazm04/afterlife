// Types for the deep ledgerline data: tasks with their proofs, the needs-you items and the setup steps.
import type { TierKey } from './types';

export interface ProofCheck {
  id: string;
  text: string;
  /** null = could not be machine-checked (a person decides): never a pass. */
  ok: boolean | null;
  /** Absent means the engine decides it. */
  decidedBy?: 'engine' | 'human';
  ref: string;
}

export interface TaskProof {
  cls: string;
  verdict: string;
  engine: string;
  digest: string;
  checks: ProofCheck[];
  claims: string[];
}

export interface Task {
  id: string;
  track: string;
  cls: string;
  mr: string | null;
  title: string;
  tierAtTime: TierKey;
  state: string;
  chain?: { step: string; obj: string; at: string }[];
  proof?: TaskProof;
  agentWords?: string;
  countsToward?: string;
  quote?: string;
  reason?: string;
  stats?: { reruns: number; passed: number; failedBefore: number };
  clock?: { kind: string; dueIn: string; total: string };
  grade?: string;
  linksResolved?: number[];
}

export interface NeedsYouItem {
  id: string;
  kind: string;
  title: string;
  from?: TierKey;
  to?: TierKey;
  /** [rule, actual value, met] */
  rules?: [string, string, boolean][];
  does: string;
  dueIn?: string;
  grade?: string;
  linksResolved?: string;
  count?: number;
  reason?: string;
}

export interface SetupPhase {
  name: string;
  /** [step number, label, status] */
  steps: [number, string, string][];
}
