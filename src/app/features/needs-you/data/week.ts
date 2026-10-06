import type { WeekRow } from './types';

/** Labels for the kinds of decision in the ledger. */
export const KIND_WORDS: Record<string, string> = {
  promote: 'Promotion',
  signoff: 'CRA sign-off',
  gaps: 'Gap pick',
  readmit: 'Re-admission',
  setup: 'Setup gate',
};

const row = (when: string, kind: string, what: string, result: string, ref: string): WeekRow => ({ when, kind, what, result, ref });

/** "Decided this week": illustrative ledger rows (the inspector says so). */
export const WEEK: readonly WeekRow[] = [
  row('3 d ago', 'promote', 'pipeline.retry · T5 medic', 'S → H', 'belay-policy!18 · merged by you'),
  row('4 d ago', 'gaps', 'Verify: JUnit report on every MR pipeline', 'picked', '!19 · merged by you'),
  row('4 d ago', 'gaps', 'Secure: SAST, secrets, dependency on main', 'picked', '!20 · merged by you'),
  row('4 d ago', 'gaps', 'Monitor: alert endpoint', 'left for later', 'no write'),
  row('5 d ago', 'setup', 'Google Cloud OIDC', 'verified', 'belay doctor'),
  row('5 d ago', 'setup', 'Secrets', 'verified', 'belay doctor'),
  row('6 d ago', 'setup', 'Bootstrap MR · guardrail armed', 'merged', '!3 · merged by you'),
];
