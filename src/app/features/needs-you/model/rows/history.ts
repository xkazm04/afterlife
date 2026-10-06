// "Decided this week": the session's decisions (newest first) above the ledger's earlier ones.
import { WEEK } from '../../data/week';
import type { HistRow, NeedsState } from '../types';

export const isHistId = (id: string): boolean => /^h\d+$/.test(id);

export function histRows(s: Pick<NeedsState, 'session'>): readonly HistRow[] {
  return [...s.session, ...WEEK];
}

export function histRow(s: Pick<NeedsState, 'session'>, id: string): HistRow | undefined {
  return isHistId(id) ? histRows(s)[Number(id.slice(1))] : undefined;
}

/** A decision made now: it goes to the top of the history. */
export function decided(s: NeedsState, kind: string, what: string, result: string, ref: string): NeedsState {
  const row: HistRow = { when: 'just now', kind, what, result, ref, fresh: true };
  return { ...s, session: [row, ...s.session] };
}
