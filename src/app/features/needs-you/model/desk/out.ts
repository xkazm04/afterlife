// The desk's outbox: rows staged for Run all, in staging order. The hook confirms each staged write in turn and reports
// its answer here; a refused or failed one never stops the run, and keeps its words until it is unstaged. Pure.
import type { DeskItem, DeskOut, DeskOutAction } from './types';

export const OUT_EMPTY: DeskOut = { order: [], result: {}, running: false };

/** Only a row with a write may be staged: the reducer holds ids, so the caller asks this before it dispatches 'stage'. */
export const canStage = (item: Pick<DeskItem, 'intent'>): boolean => item.intent !== null;

const without = <V,>(rec: Readonly<Record<string, V>>, id: string): Record<string, V> =>
  Object.fromEntries(Object.entries(rec).filter(([k]) => k !== id));

/** The outbox after one action. Anything an action may not do in the current state leaves it as it was. */
export function outReduce(s: DeskOut, a: DeskOutAction): DeskOut {
  switch (a.type) {
    case 'stage':
      if (s.order.includes(a.id)) return s;
      return { ...s, order: [...s.order, a.id], result: { ...s.result, [a.id]: { state: 'staged', text: null } } };
    case 'unstage':
      if (s.running || !s.order.includes(a.id)) return s;
      return { ...s, order: s.order.filter((id) => id !== a.id), result: without(s.result, a.id) };
    case 'start':
      if (s.running || s.order.length === 0) return s;
      return { ...s, running: true, result: { ...s.result, ...Object.fromEntries(s.order.map((id) => [id, { state: 'staged' as const, text: null }])) } };
    case 'result':
      if (!s.order.includes(a.id)) return s;
      return { ...s, result: { ...s.result, [a.id]: { state: a.state, text: a.text } } };
    case 'finish':
      if (!s.running) return s;
      return { ...s, running: false, order: s.order.filter((id) => s.result[id]?.state !== 'done') };
  }
}
