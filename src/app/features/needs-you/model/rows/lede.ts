import type { NeedsYouDemo } from '../../data/types';
import type { NeedsState } from '../types';
import { rowView } from './rowData';
import { rowState } from './rowState';

/** The one line under a decision's title: its state, what the click writes, and the clock or when it was opened. */
export function itemLede(s: NeedsState, id: string, demo: NeedsYouDemo, clock: string): string {
  const v = rowView(s, id, demo);
  if (!v) return 'No such decision';
  const writes = v.writes.kind === 'text' ? `writes ${v.writes.text}` : v.writes.kind === 'issue' ? 'writes an issue' : 'writes nothing';
  return [rowState(s, id).label, writes, v.due ? `${clock} left` : v.when].filter(Boolean).join(' · ');
}
