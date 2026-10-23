// The desk's rows from the live inbox and the decided list: every item becomes a row (nothing is dropped), each with the
// write its click previews or why it is read-only here. Pure.
import type { DecidedItem } from '@/server/data/types';
import type { NeedsYouItem } from '@/lib/demo/types';
import { elsewhere, gapIntent, gapReadOnly, liveIntent } from '../live';
import type { Deadline, DeskItem, DeskKind } from './types';

const DAY_MIN = 24 * 60;

/** Minutes in a countdown ("19 h 12 m", "7 m"); null when the text names neither. */
function countdownMin(text: string): number | null {
  const h = /(\d+)\s*h/.exec(text);
  const m = /(\d+)\s*m/.exec(text);
  return h || m ? (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0) : null;
}

/**
 * The deadline bucket of a countdown, against the UTC day of `now` (the index's clock is UTC). An unreadable countdown is
 * 'today': it has a deadline nobody can read, so it sorts with the soonest rather than hiding among the later ones.
 */
export function deadlineOf(dueIn: string | undefined, now: Date): Deadline {
  if (!dueIn) return 'none';
  if (dueIn.trim() === 'overdue') return 'overdue';
  const min = countdownMin(dueIn);
  if (min === null) return 'today';
  const leftToday = DAY_MIN - (now.getUTCHours() * 60 + now.getUTCMinutes());
  return min < leftToday ? 'today' : 'later';
}

/** The desk kind of an inbox item: a gap is one with a stage, or the seeded gaps parent (read-only). */
const kindOf = (item: NeedsYouItem): DeskKind =>
  item.kind === 'promote' || item.kind === 'readmit' ? item.kind : item.kind === 'gaps' ? 'gap' : 'other';

/** One open inbox item as a row. */
function openRow(item: NeedsYouItem, project: string, now: Date): DeskItem {
  const kind = kindOf(item);
  const intent = kind === 'gap' ? gapIntent(item, project) : liveIntent(item, project);
  const readOnly = intent ? null : kind === 'gap' && item.stage ? gapReadOnly(item) : elsewhere(item.kind);
  return {
    id: item.id, kind, project, title: item.title, openedAt: item.openedAt ?? null, actedAt: null, actedAs: null,
    group: { kind, project, deadline: deadlineOf(item.dueIn, now) },
    intent, readOnly, source: item, decided: null,
  };
}

/** One decided item as a read-only row with when and by whom it was acted on. */
function decidedRow(d: DecidedItem): DeskItem {
  return {
    id: d.id, kind: 'decided', project: d.project, title: d.title, openedAt: null, actedAt: d.actedAt, actedAs: d.actedAs,
    group: { kind: 'decided', project: d.project, deadline: 'none' },
    intent: null, readOnly: null, source: null, decided: d,
  };
}

/** The desk rows: open inbox items, then the decided ones. */
export function deskItems(items: readonly NeedsYouItem[], decided: readonly DecidedItem[], project: string, now: Date): DeskItem[] {
  return [...items.map((n) => openRow(n, project, now)), ...decided.map(decidedRow)];
}
