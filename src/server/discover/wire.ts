// The /api/onboard/* answers, shared by the routes and the wizard (type only on the client side).
import type { ClaudeRepo, Engine, ProbeResult, Proposal } from '@/schemas/vitals';

/** The two engines the wizard offers; the client names one, never a model string. */
export type EngineKey = 'sonnet' | 'haiku';

/** Why an onboard call did not answer, for the wizard to pick its state. */
export type OnboardErrorCode = 'not-local' | 'bad-request' | 'bad-root' | 'claude-missing' | 'invalid' | 'failed';

export interface OnboardError {
  error: string;
  code: OnboardErrorCode;
}

export interface ReposAnswer {
  repos: ClaudeRepo[];
}

export interface ProposeAnswer {
  /** The git toplevel the path resolved to. */
  root: string;
  proposal: Proposal;
  ms: number;
  engine: Engine;
  dropped: number;
  /** The CI definition files in the repo (facts/ci), so the checklist can say which one never ran. */
  ciFiles: string[];
}

export interface ProbeAnswer {
  result: ProbeResult;
  /** The server's seal over the result; the save step keeps only sealed results. */
  seal: string;
}

export interface SaveAnswer {
  slug: string;
  /** Results handed in without a valid seal, left out of the save. */
  unsealed: number;
}
