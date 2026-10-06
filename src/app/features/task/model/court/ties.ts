import type { CheckResult, TaskView } from '../types';
import { checkShown, replayDone, type ReplayState } from '../verdict/replay';
import { isSelected, type Selection } from './selection';

export type TieKind = 'holds' | 'contradicts' | 'unknown';
export type TieEmphasis = 'on' | 'dim' | 'rest';

export interface Tie {
  claimId: string;
  checkId: string;
  kind: TieKind;
  emphasis: TieEmphasis;
}

/** Green holds, red contradicts, dashed unknown. */
export const tieKind = (ok: CheckResult): TieKind => (ok === true ? 'holds' : ok === false ? 'contradicts' : 'unknown');

/** Stroke opacity: the selection's ties are full, the rest recede; with no selection every tie is a little soft. */
export const tieOpacity = (e: TieEmphasis): number => (e === 'on' ? 1 : e === 'dim' ? 0.16 : 0.75);
/** Stroke width in unscaled px (multiply by --ui-scale). */
export const tieWidth = (e: TieEmphasis): number => (e === 'on' ? 2.2 : 1.4);

/** One tie per claim/check pair, skipping checks that have not landed yet in a replay. */
export function ties(task: TaskView, sel: Selection, rv: ReplayState): Tie[] {
  const out: Tie[] = [];
  for (const claim of task.claims) {
    for (const checkId of claim.checks) {
      const i = task.proof.checks.findIndex((c) => c.id === checkId);
      const check = task.proof.checks[i];
      if (!check || !checkShown(rv, i)) continue;
      const on = isSelected(sel, 'claim', claim.id) || isSelected(sel, 'check', checkId);
      out.push({ claimId: claim.id, checkId, kind: tieKind(check.ok), emphasis: !sel ? 'rest' : on ? 'on' : 'dim' });
    }
  }
  return out;
}

export interface Untested {
  claimId: string;
  dim: boolean;
}

/** Claims no check tests: a dashed "?" tie, "no weight". Drawn only once the verdict has landed. */
export function untestedClaims(task: TaskView, sel: Selection, rv: ReplayState): Untested[] {
  if (!replayDone(rv, task.proof.checks.length)) return [];
  return task.claims
    .filter((c) => !c.checks.length)
    .map((c) => ({ claimId: c.id, dim: !!sel && !isSelected(sel, 'claim', c.id) }));
}

/** The cubic path between the right edge of a claim and the left edge of a check. */
export function tiePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
}
