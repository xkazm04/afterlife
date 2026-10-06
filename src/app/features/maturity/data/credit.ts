import type { CreditEntry } from './types';

// Past autopilot cycles. Same engine throughout (credit never crosses engine versions).
export const CREDIT_HISTORY: readonly CreditEntry[] = [
  { mr: '!17', stage: 'secure', move: 'R0 → R1', verdict: 'credited', why: 'scanner includes on main' },
  { mr: '!17', stage: 'secure', move: 'R1 → R2', verdict: 'credited', why: 'credited only after pipeline #9812 ran and produced reports' },
  { mr: '!19', stage: 'package', move: 'R0 → R2', verdict: 'credited', why: 'build-image ran; registry tag present' },
  { mr: '!20', stage: 'release', move: 'R0 → R2', verdict: 'credited', why: 'release v0.4.2 cut by the job, SBOM asset attached' },
  { mr: '!21', stage: 'monitor', move: 'R1 → R2', verdict: 'rejected', why: 'whole diff was an empty .gitlab/alerting.yml: detector surface only' },
  { mr: '!22', stage: 'configure', move: 'R0 → R2', verdict: 'credited', why: 'state written by a pipeline; deployment recorded' },
  { mr: '!23', stage: 'secure', move: 'R2 → R3', verdict: 'credited', why: 'policy block-critical present at the 14:02 scan' },
];
