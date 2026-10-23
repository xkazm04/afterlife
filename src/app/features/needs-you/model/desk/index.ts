// Stubs with the final signatures: D3 builds them. NeedsYouLive (D4) imports only from here.
import type { DecidedItem } from '@/server/data/types';
import type { NeedsYouItem } from '@/lib/demo/types';
import type { DeskGroup, DeskItem, DeskOut, DeskOutAction, DeskSummary, Grouping } from './types';

export type * from './types';

export const OUT_EMPTY: DeskOut = { order: [], result: {}, running: false };

/** The desk rows: open inbox items, then the decided ones. */
export function deskItems(_items: readonly NeedsYouItem[], _decided: readonly DecidedItem[], _project: string, _now: Date): DeskItem[] {
  return [];
}

/** Rows in groups by kind, project or deadline; decided rows are always the last group. */
export function groupDesk(_items: readonly DeskItem[], _by: Grouping): DeskGroup[] {
  return [];
}

export function summarize(_items: readonly DeskItem[]): DeskSummary {
  return { count: 0, projects: 0, oldestOpenedAt: null };
}

export function outReduce(s: DeskOut, _a: DeskOutAction): DeskOut {
  return s;
}
