import { plural } from '@/lib/format/plural';
import type { Verdict } from '../types';
import type { DocketRow } from './row';

/** What the filters read of a task: its docket row (the derived verdict and the proof class). */
type Row = Pick<DocketRow, 'id' | 'verdict' | 'cls'>;
const verdictOfTask = (t: Row): Verdict => t.verdict;

/** 'open': neither PASS nor FAIL (INCONCLUSIVE or UNKNOWN), the tasks a person must decide. */
export type VerdictFilter = 'all' | 'open' | Verdict;
const isOpen = (t: Row): boolean => verdictOfTask(t) !== 'PASS' && verdictOfTask(t) !== 'FAIL';
export interface Filters {
  verdict: VerdictFilter;
  /** A proof class, or 'all'. */
  cls: string;
}

export const NO_FILTERS: Filters = { verdict: 'all', cls: 'all' };

/** Filters only hide: they never change a task. */
export function visibleTasks<T extends Row>(tasks: readonly T[], f: Filters): T[] {
  return tasks.filter((t) => (f.verdict === 'all' || (f.verdict === 'open' ? isOpen(t) : verdictOfTask(t) === f.verdict)) && (f.cls === 'all' || t.cls === f.cls));
}

export function verdictCounts(tasks: readonly Row[]): { all: number; pass: number; fail: number; open: number } {
  const count = (v: Verdict): number => tasks.filter((t) => verdictOfTask(t) === v).length;
  return { all: tasks.length, pass: count('PASS'), fail: count('FAIL'), open: tasks.filter(isOpen).length };
}

export const classCount = (tasks: readonly Pick<Row, 'cls'>[], cls: string): number => tasks.filter((t) => t.cls === cls).length;

/** The "f" key: fail only, or back to all verdicts. */
export const toggleFailOnly = (f: Filters): Filters => ({ ...f, verdict: f.verdict === 'FAIL' ? 'all' : 'FAIL' });

/** The next/previous visible task id, wrapping. From an id that is not visible: forward is the first, back is the last. Null when nothing is visible. */
export function stepTask(visible: readonly Row[], currentId: string, delta: 1 | -1): string | null {
  if (!visible.length) return null;
  const at = visible.findIndex((t) => t.id === currentId);
  const next = visible[at < 0 ? (delta === 1 ? 0 : visible.length - 1) : (at + delta + visible.length) % visible.length];
  return next?.id ?? null;
}

/** After a filter change: the id to move to when the open task was filtered out, else null (stay). */
export function idAfterFilter(visible: readonly Row[], currentId: string): string | null {
  if (!visible.length || visible.some((t) => t.id === currentId)) return null;
  return visible[0]?.id ?? null;
}

/** "7" when everything is shown, "2 / 7" when filtered. */
export const docketCount = (shown: number, total: number): string => (shown === total ? String(total) : `${shown} / ${total}`);

/** `ledgerAgeSec` null: no poll has happened yet. `now` null: the wall clock is not known yet (the first render). */
export function statusLine(visible: readonly Row[], ledgerAgeSec: number | null, now: string | null): string {
  const fails = visible.filter((t) => verdictOfTask(t) === 'FAIL').length;
  const open = visible.filter(isOpen).length;
  const read = ledgerAgeSec === null ? 'ledger not read yet' : `ledger read ${ledgerAgeSec} s ago`;
  return `${plural(visible.length, 'task')} · ${fails} fail${open ? ` · ${open} undetermined` : ''} · ${read}${now ? ` · ${now}` : ''} · reads only`;
}
