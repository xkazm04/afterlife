import type { CheckKind, CheckResult, TaskView } from '../types';
import { isSelected, type Selection } from '../court/selection';
import { KIND_GLYPH, derivedVerdict, termKind } from './verdict';
import { checkShown, replayDone, type ReplayState } from './replay';

export interface EquationTerm {
  id: string;
  text: string;
  ok: CheckResult;
  kind: CheckKind;
  glyph: string;
  /** false = not replayed yet: drawn dotted, not a button. */
  landed: boolean;
  selected: boolean;
}

/** The terms in check order. A struck term (a person decides it) draws open, '?', whatever its ok: never a hold or a fail. */
export function equationTerms(task: TaskView, sel: Selection, rv: ReplayState): EquationTerm[] {
  return task.proof.checks.map((c, i) => ({
    id: c.id,
    text: c.text,
    ok: c.ok,
    kind: termKind(c),
    glyph: KIND_GLYPH[termKind(c)],
    landed: checkShown(rv, i),
    selected: isSelected(sel, 'check', c.id),
  }));
}

/** The big word: the verdict derived from the checks once every term has landed, "checking…" while a replay runs. */
export function verdictWord(task: TaskView, rv: ReplayState): { word: string; waiting: boolean; fail: boolean; mismatch: boolean; stored: string } {
  const done = replayDone(rv, task.proof.checks.length);
  const d = derivedVerdict(task);
  return { word: done ? d.verdict : 'checking…', waiting: !done, fail: done && d.verdict === 'FAIL', mismatch: done && d.mismatch, stored: d.stored };
}
