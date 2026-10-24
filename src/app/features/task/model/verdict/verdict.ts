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

export interface DerivedVerdict {
  /** What the checks say: the word every consumer draws. */
  verdict: Verdict;
  /** What the task's proof stored. Never drawn as the verdict. */
  stored: Verdict;
  /** The stored word differs from the derived one (a stored UNKNOWN is no claim, so it never disagrees). */
  mismatch: boolean;
}

/**
 * The verdict the screen shows: derived by `verdictOf` from the engine's checks, never read from the stored word. A task
 * holding no checks and no stored verdict stays UNKNOWN, unless its known envelope is breached: that fails, checks or none,
 * as in `verdictOf`. An unknown envelope (a source task with no fixture) is no evidence of a breach, so the checks alone
 * decide there.
 */
export function derivedVerdict(task: Pick<TaskView, 'proof' | 'envelope'>): DerivedVerdict {
  const stored = task.proof.verdict;
  const checks = task.proof.checks;
  const verdict: Verdict =
    !checks.length && stored === 'UNKNOWN' && task.envelope?.within !== false ? 'UNKNOWN' : (verdictLabel(verdictOf(proofChecks(checks), task.envelope?.within ?? true)) as Verdict);
  return { verdict, stored, mismatch: stored !== 'UNKNOWN' && stored !== verdict };
}

/** Whether a check is a struck term: a person decides it, so it does not weigh on the verdict (reasons.ts reads it). */
export const isStruck = (c: { decidedBy?: 'engine' | 'human' }): boolean => c.decidedBy === 'human';
/** How a term draws and counts: a struck term is open ('?') whatever its ok, never a hold and never a fail. */
export const termKind = (c: { ok: CheckResult; decidedBy?: 'engine' | 'human' }): CheckKind => (isStruck(c) ? 'unk' : checkKind(c.ok));

export interface Tally {
  ok: number;
  bad: number;
  unk: number;
}

/** Counts of the terms landed so far. `shown` says whether term i has landed (replay reveals them one by one). */
export function tally(task: TaskView, shown: (i: number) => boolean = () => true): Tally {
  const t: Tally = { ok: 0, bad: 0, unk: 0 };
  task.proof.checks.forEach((c, i) => {
    if (shown(i)) t[termKind(c)] += 1;
  });
  return t;
}

export interface ClaimStatus {
  kind: CheckKind;
  label: string;
}

/**
 * What the checks say about a claim. A contradiction wins over an open check; no check at all means no weight. A struck
 * check (a person decides it) is open whatever its ok, as its term is (termKind).
 */
export function claimStatus(task: TaskView, claim: TaskClaim): ClaimStatus {
  if (!claim.checks.length) return { kind: 'unk', label: '? no weight' };
  const kinds = claim.checks.map((id) => {
    const c = task.proof.checks.find((x) => x.id === id);
    return c ? termKind(c) : 'unk';
  });
  if (kinds.includes('bad')) return { kind: 'bad', label: '✗ contradicted' };
  if (kinds.includes('unk')) return { kind: 'unk', label: '? open' };
  return { kind: 'ok', label: `✓ upheld · ${claim.checks.length}` };
}

/** Words for the inspector's ruling on a check. */
export function ruleWord(ok: CheckResult): string {
  return ok === true ? 'holds' : ok === false ? 'fails the verdict' : 'a person decides';
}
