import type { CheckKind, CheckResult, TaskView } from '../types';
import { isSelected, type Selection } from '../court/selection';
import { checkGlyph, checkKind } from './verdict';
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

export function equationTerms(task: TaskView, sel: Selection, rv: ReplayState): EquationTerm[] {
  return task.proof.checks.map((c, i) => ({
    id: c.id,
    text: c.text,
    ok: c.ok,
    kind: checkKind(c.ok),
    glyph: checkGlyph(c.ok),
    landed: checkShown(rv, i),
    selected: isSelected(sel, 'check', c.id),
  }));
}

/** The big word: the stored verdict once every term has landed, "checking…" while a replay runs. */
export function verdictWord(task: TaskView, rv: ReplayState): { word: string; waiting: boolean; fail: boolean } {
  const done = replayDone(rv, task.proof.checks.length);
  return { word: done ? task.proof.verdict : 'checking…', waiting: !done, fail: done && task.proof.verdict === 'FAIL' };
}
