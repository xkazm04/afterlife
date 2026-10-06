// The packet's grade ladder: draft -> reviewable -> ready to sign. "attested" is never reachable.
import { GRADES } from '../../data/cra';
import type { DecisionStatus } from '../types';

export type GradeState = 'cur' | 'done' | 'idle';

/** Today's grade index. The packet is reviewable until the sign-off is sent, then ready to sign. */
export function gradeIndex(status: DecisionStatus): number {
  return status === 'sent' ? 2 : 1;
}

/** How a rung of the ladder is drawn: the last rung is "done" (green), any other current rung is "cur" (amber). */
export function gradeState(index: number, current: number): GradeState {
  if (index !== current) return 'idle';
  return current === GRADES.length - 1 ? 'done' : 'cur';
}

/** The grade a person can reach by clicking: it only ever moves up by one, and never past the last rung. */
export function nextGrade(current: number): number {
  return Math.min(GRADES.length - 1, current + 1);
}
