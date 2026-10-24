// The packet's grade ladder: draft -> reviewable -> ready to sign. "attested" is never reachable.
import { GRADES } from '../../data/cra';
import type { DecisionStatus } from '../types';

export type GradeState = 'cur' | 'done' | 'idle';

/** The source's "a / b" link count, read once for the grade and the evidence strip; null when it does not read as one. */
export function linksCount(linksResolved: string): { resolved: number; total: number } | null {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(linksResolved);
  return m ? { resolved: Number(m[1]), total: Number(m[2]) } : null;
}

/**
 * How many of `ticks` evidence links to draw resolved: as far as the count says, 0 when it is not held or does not read
 * as one; while the count says a link is unresolved (the grade is draft), one tick at least stays open.
 */
export function resolvedTicks(linksResolved: string, ticks: number): number {
  const c = linksCount(linksResolved);
  if (!c) return 0;
  return Math.min(c.resolved, c.resolved < c.total ? ticks - 1 : ticks);
}

/** True when the source says "a / b" with a < b: a link is unresolved. An unreadable count says nothing either way. */
export function linksUnresolved(linksResolved: string): boolean {
  const c = linksCount(linksResolved);
  return !!c && c.resolved < c.total;
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
