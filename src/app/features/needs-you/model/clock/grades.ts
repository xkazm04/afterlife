// The packet's grade ladder: draft -> reviewable -> ready to sign. "attested" is never reachable.
import { GRADES } from '../../data/cra';
import type { DecisionStatus } from '../types';

export type GradeState = 'cur' | 'done' | 'idle';

/** True when the source says "a / b" with a < b: a link is unresolved. An unreadable count says nothing either way. */
export function linksUnresolved(linksResolved: string): boolean {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(linksResolved);
  return !!m && Number(m[1]) < Number(m[2]);
}

/** Today's grade index. Draft while a link is unresolved; otherwise reviewable until the sign-off is sent, then ready to sign. */
export function gradeIndex(status: DecisionStatus, linksResolved: string): number {
  if (linksUnresolved(linksResolved)) return 0;
  return status === 'sent' ? 2 : 1;
}

/** How a rung of the ladder is drawn: the last rung is "done" (green), any other current rung is "cur" (amber). */
export function gradeState(index: number, current: number): GradeState {
  if (index !== current) return 'idle';
  return current === GRADES.length - 1 ? 'done' : 'cur';
}
