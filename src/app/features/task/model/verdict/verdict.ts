import type { CheckKind, CheckResult, TaskClaim, TaskView, Verdict } from '../types';

export const checkKind = (ok: CheckResult): CheckKind => (ok === true ? 'ok' : ok === false ? 'bad' : 'unk');
export const checkGlyph = (ok: CheckResult): string => (ok === true ? '✓' : ok === false ? '✗' : '?');

/**
 * The verdict is the AND of the engine's checks: one failed check fails it. A check nobody could decide (null) is a
 * struck term: it is not a pass and not a fail, a person decides. Claims are never terms.
 */
export function deriveVerdict(checks: readonly { ok: CheckResult }[], envelopeWithin = true): Verdict {
  if (!envelopeWithin) return 'FAIL';
  return checks.some((c) => c.ok === false) ? 'FAIL' : 'PASS';
}

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
