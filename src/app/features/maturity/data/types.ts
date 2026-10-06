import type { Stage } from '@/schemas';

/** One GitLab object a rung's detector read. kind 'file' can only ever earn R1: presence is not behaviour. */
export interface EvidenceObject {
  kind: string;
  label: string;
  ref: string;
  /** Path under the project URL (illustrative). */
  path: string;
}

export type EvidenceRung = 1 | 2 | 3 | 4;

/** Per stage: the evidence objects per earned rung, what the next rung still lacks, the day-0 note. */
export interface StageEvidence {
  objs: Readonly<Partial<Record<EvidenceRung, readonly EvidenceObject[]>>>;
  missing: string;
  day0: string;
}

export interface DiffFile {
  path: string;
  isNew?: boolean;
  /** Unified-diff style lines: a leading '+' is an addition, a leading space is context. */
  lines: readonly string[];
}

/** Screen-local data for one gap proposal; the shared dataset has id, stage, from, to, title, diffLines. */
export interface ProposalExtra {
  invite: string;
  workItem: string;
  branch: string | null;
  repo: string;
  mrId: string | null;
  kind: 'mr' | 'probe';
  cls: string;
  tier: 'assisted' | null;
  earns: string;
  /** True when the change adds a job that must run before it can earn the rung (configured is not exercised). */
  needsRun: boolean;
  /** What the simulated "it ran" step is: a pipeline on main, or the next tagged release pipeline. */
  runsOn: 'main' | 'tag';
  probeResult?: string;
  files: readonly DiffFile[];
}

/** A past autopilot cycle, for the per-stage credit history. */
export interface CreditEntry {
  mr: string;
  stage: Stage;
  move: string;
  verdict: 'credited' | 'rejected';
  why: string;
}
