// belay-ledger events -> a film. Pure; it imports only types from @/schemas/ledger, and the loader runs it on the server.
// Each entry states only what its event states: its facts are the one event-to-facts table's (@/schemas/chain/facts).
import { eventFacts } from '@/schemas/chain/facts';
import type { LedgerEvent } from '@/schemas/ledger';
import type { Film, LedgerEntry, Take } from '../types';
import { HOLDS, holdOf } from './holds';

/** An entry that moves the climber dwells longer, as on the illustrative slice. */
const HOLD_DWELL_MS = 3400;
const HASH_PREFIX = 12;
/** A real film keeps 8 MRs, one per take key (1-8, hooks/useTheaterKeys.ts). */
export const MAX_TAKES = 8;

/** hh:mm:ss of an ISO time, in UTC (the same on the server and in the browser); the raw text if it is not one. */
function clockOf(at: string): string {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toISOString().slice(11, 19);
}

/** One MR's events, in seq order, as the film's entries. */
export function entriesOf(events: readonly LedgerEvent[]): LedgerEntry[] {
  let at = 0;
  return events.map((e) => {
    const hold = holdOf(e);
    if (hold !== null) at = hold;
    const verdict = e.verdict ? ` · ${e.verdict}` : '';
    const env = e.environment ? ` · ${e.environment.name} (${e.environment.tier})` : '';
    return {
      seq: e.seq,
      t: clockOf(e.at),
      by: e.agent,
      x: `${e.kind}${verdict}${env} · ${e.action_class} · ${e.tier_at_time} · !${e.subject.iid}`,
      sc: at,
      now: `${e.agent} · ${e.kind} on !${e.subject.iid}`,
      tier: { cls: e.action_class, to: e.tier_at_time },
      ...(hold !== null ? { beat: hold, d: HOLD_DWELL_MS } : {}),
      ev: {
        at: e.at, kind: e.kind, actionClass: e.action_class, tier: e.tier_at_time,
        ...(e.verdict ? { verdict: e.verdict } : {}),
        ...(e.environment ? { environment: e.environment } : {}),
        iid: e.subject.iid, hash: e.hash.slice(0, HASH_PREFIX), facts: eventFacts(e),
      },
    };
  });
}

/** What the address asks of the film: `mr`, the MR to film first (`/theater?mr=N`). */
interface FilmFocus {
  mr?: number;
}

/**
 * The deep project's ledger as a film, one take per MR (events about anything but an MR are not filmed), or null when
 * no event names an MR. Only MAX_TAKES MRs are kept, and only their entries are filmed. With a focus MR the ledger
 * holds, that MR is the first take wherever it sits in the chain; the other slots are filled by the rule below. A focus
 * MR the ledger does not hold leaves the film as it is and is named in `missing`. Unfocused: the MAX_TAKES newest MRs
 * (by last seq), the first take the newest with a `merged` event, else the newest; the rest follow newest first.
 */
export function ledgerFilm(events: readonly LedgerEvent[], focus: FilmFocus = {}): Film | null {
  const byMr = new Map<number, LedgerEvent[]>();
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    if (e.subject.type !== 'mr') continue;
    const es = byMr.get(e.subject.iid);
    if (es) es.push(e);
    else byMr.set(e.subject.iid, [e]);
  }
  const lastSeq = (es: readonly LedgerEvent[]): number => es[es.length - 1]?.seq ?? 0;
  const focused = focus.mr !== undefined ? byMr.get(focus.mr) : undefined;
  const pinned = focused ? [[focus.mr!, focused] as [number, LedgerEvent[]]] : [];
  const rest = [...byMr]
    .filter(([iid]) => !focused || iid !== focus.mr)
    .sort(([, a], [, b]) => lastSeq(b) - lastSeq(a))
    .slice(0, MAX_TAKES - pinned.length);
  const first = rest.find(([, es]) => es.some((e) => e.kind === 'merged')) ?? rest[0];
  const order = [...pinned, ...(first ? [first] : []), ...rest.filter((m) => m !== first)];
  if (!order.length) return null;
  const takes: Take[] = order.map(([iid, es]) => ({ name: `!${iid}`, a: es[0]?.seq ?? 0, b: lastSeq(es), mr: iid }));
  const missing = focus.mr !== undefined && !focused ? { missing: focus.mr } : {};
  return { source: 'belay-ledger', entries: order.flatMap(([, es]) => entriesOf(es)), takes, holds: HOLDS, ...missing };
}
