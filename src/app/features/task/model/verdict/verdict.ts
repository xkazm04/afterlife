import { verdictOf, type Check, type Verdict as ProofVerdict } from '@/schemas';
import type { CheckKind, CheckResult, TaskCheck, TaskClaim, TaskView, Verdict } from '../types';

export const checkKind = (ok: CheckResult): CheckKind => (ok === true ? 'ok' : ok === false ? 'bad' : 'unk');
/** The kind a stored verdict draws as: only PASS is ok, only FAIL is bad, INCONCLUSIVE and UNKNOWN are open. */
export const verdictKind = (v: Verdict): CheckKind => (v === 'PASS' ? 'ok' : v === 'FAIL' ? 'bad' : 'unk');
export const verdictGlyph = (v: Verdict): string => (v === 'PASS' ? '✓' : v === 'FAIL' ? '✗' : '?');
export const checkGlyph = (ok: CheckResult): string => (ok === true ? '✓' : ok === false ? '✗' : '?');

/**
 * The word the screen shows for a schema verdict (`verdictOf` from `@/schemas`). The verdict itself is derived there:
 * the AND of the engine's checks. A check a person decides (`decidedBy: 'human'`) is a struck term, never a pass and
 * never a fail. Claims are never terms. The demo has no inconclusive task; it would read "INCONCLUSIVE".
 */
export const verdictLabel = (v: ProofVerdict): string => v.toUpperCase();

/** The screen's checks as schema checks, so the one `verdictOf` derives the verdict for every consumer. */
export const proofChecks = (checks: readonly TaskCheck[]): Check[] =>
  checks.map((c) => ({ claim_id: c.claims[0] ?? null, name: c.id, ok: c.ok, decidedBy: c.decidedBy, detail: c.text, ref: c.ref }));

/**
 * The verdict of a task as the screen words it, derived by the schema's `verdictOf` from its checks and envelope. An
 * unknown envelope is never read as inside it.
 */
export const taskVerdict = (task: Pick<TaskView, 'proof' | 'envelope'>): string =>
  verdictLabel(verdictOf(proofChecks(task.proof.checks), task.envelope?.within ?? false));

/** Whether a check is a struck term: a person decides it, so it does not weigh on the verdict. */
export const isStruck = (c: { decidedBy?: 'engine' | 'human' }): boolean => c.decidedBy === 'human';

export interface Tally {
  ok: number;
  bad: number;
  unk: number;
}

/** Counts of the terms landed so far. `shown` says whether term i has landed (replay reveals them one by one). */
export function tally(task: TaskView, shown: (i: number) => boolean = () => true): Tally {
  const t: Tally = { ok: 0, bad: 0, unk: 0 };
  task.proof.checks.forEach((c, i) => {
    if (shown(i)) t[checkKind(c.ok)] += 1;
  });
  return t;
}

export interface ClaimStatus {
  kind: CheckKind;
  label: string;
}

/** What the checks say about a claim. A contradiction wins over an open check; no check at all means no weight. */
export function claimStatus(task: TaskView, claim: TaskClaim): ClaimStatus {
  if (!claim.checks.length) return { kind: 'unk', label: '? no weight' };
  const results = claim.checks.map((id) => task.proof.checks.find((c) => c.id === id)?.ok ?? null);
  if (results.includes(false)) return { kind: 'bad', label: '✗ contradicted' };
  if (results.includes(null)) return { kind: 'unk', label: '? open' };
  return { kind: 'ok', label: `✓ upheld · ${claim.checks.length}` };
}

/** Words for the inspector's ruling on a check. */
export function ruleWord(ok: CheckResult): string {
  return ok === true ? 'holds' : ok === false ? 'fails the verdict' : 'a person decides';
}
