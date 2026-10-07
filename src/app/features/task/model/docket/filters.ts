import { plural } from '@/lib/format/plural';
import type { TaskView, Verdict } from '../types';

export type VerdictFilter = 'all' | Verdict;
export interface Filters {
  verdict: VerdictFilter;
  /** A proof class, or 'all'. */
  cls: string;
}

export const NO_FILTERS: Filters = { verdict: 'all', cls: 'all' };

/** Filters only hide: they never change a task. */
export function visibleTasks(tasks: readonly TaskView[], f: Filters): TaskView[] {
  return tasks.filter((t) => (f.verdict === 'all' || t.proof.verdict === f.verdict) && (f.cls === 'all' || t.proof.cls === f.cls));
}

export function verdictCounts(tasks: readonly TaskView[]): { all: number; pass: number; fail: number } {
  const count = (v: Verdict): number => tasks.filter((t) => t.proof.verdict === v).length;
  return { all: tasks.length, pass: count('PASS'), fail: count('FAIL') };
}

export const classCount = (tasks: readonly TaskView[], cls: string): number => tasks.filter((t) => t.proof.cls === cls).length;

/** The "f" key: fail only, or back to all verdicts. */
export const toggleFailOnly = (f: Filters): Filters => ({ ...f, verdict: f.verdict === 'FAIL' ? 'all' : 'FAIL' });

/** The next/previous visible task id, wrapping. Null when nothing is visible. */
export function stepTask(visible: readonly TaskView[], currentId: string, delta: 1 | -1): string | null {
  if (!visible.length) return null;
  const at = visible.findIndex((t) => t.id === currentId);
  const next = visible[(at + delta + visible.length) % visible.length];
  return next?.id ?? null;
}

/** After a filter change: the id to move to when the open task was filtered out, else null (stay). */
export function idAfterFilter(visible: readonly TaskView[], currentId: string): string | null {
  if (!visible.length || visible.some((t) => t.id === currentId)) return null;
  return visible[0]?.id ?? null;
}

/** "7" when everything is shown, "2 / 7" when filtered. */
export const docketCount = (shown: number, total: number): string => (shown === total ? String(total) : `${shown} / ${total}`);

export function statusLine(visible: readonly TaskView[], ledgerAgeSec: number, now: string): string {
  const fails = visible.filter((t) => t.proof.verdict === 'FAIL').length;
  const open = visible.filter((t) => t.proof.verdict !== 'PASS' && t.proof.verdict !== 'FAIL').length;
  return `${plural(visible.length, 'task')} · ${fails} fail${open ? ` · ${open} undetermined` : ''} · ledger read ${ledgerAgeSec} s ago · ${now} · reads only`;
}
