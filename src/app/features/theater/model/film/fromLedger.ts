// belay-ledger events -> a film. Pure; it imports only types from @/schemas/ledger, and the loader runs it on the server.
// Each entry states only what its event states (at, agent, kind, class, tier at the time, verdict, MR, seq, hash prefix).
import type { LedgerEvent } from '@/schemas/ledger';
import type { Film, LedgerEntry, Take } from '../types';
import { HOLDS, KIND_HOLD } from './holds';

/** An entry that moves the climber dwells longer, as on the illustrative slice. */
const HOLD_DWELL_MS = 3400;
const HASH_PREFIX = 12;
/** A real film keeps the 8 newest MRs, one per take key (1-8, hooks/useTheaterKeys.ts). */
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
    const hold = KIND_HOLD[e.kind];
    if (hold !== null) at = hold;
    const verdict = e.verdict ? ` · ${e.verdict}` : '';
    return {
      seq: e.seq,
      t: clockOf(e.at),
      by: e.agent,
      x: `${e.kind}${verdict} · ${e.action_class} · ${e.tier_at_time} · !${e.subject.iid}`,
      sc: at,
      now: `${e.agent} · ${e.kind} on !${e.subject.iid}`,
      tier: { cls: e.action_class, to: e.tier_at_time },
      ...(hold !== null ? { beat: hold, d: HOLD_DWELL_MS } : {}),
      ev: {
        at: e.at, kind: e.kind, actionClass: e.action_class, tier: e.tier_at_time,
        ...(e.verdict ? { verdict: e.verdict } : {}),
        iid: e.subject.iid, hash: e.hash.slice(0, HASH_PREFIX),
      },
    };
  });
}

/**
 * The deep project's ledger as a film, one take per MR (events about anything but an MR are not filmed), or null when
 * no event names an MR. Only the MAX_TAKES newest MRs (by last seq) are kept, and only their entries are filmed. Of
 * those, the first take is the newest with a `merged` event, else the newest; the rest follow newest first.
 */
export function ledgerFilm(events: readonly LedgerEvent[]): Film | null {
  const byMr = new Map<number, LedgerEvent[]>();
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    if (e.subject.type !== 'mr') continue;
    byMr.set(e.subject.iid, [...(byMr.get(e.subject.iid) ?? []), e]);
  }
  const lastSeq = (es: readonly LedgerEvent[]): number => es[es.length - 1]?.seq ?? 0;
  const mrs = [...byMr].sort(([, a], [, b]) => lastSeq(b) - lastSeq(a)).slice(0, MAX_TAKES);
  const first = mrs.find(([, es]) => es.some((e) => e.kind === 'merged')) ?? mrs[0];
  if (!first) return null;
  const order = [first, ...mrs.filter((m) => m !== first)];
  const takes: Take[] = order.map(([iid, es]) => ({ name: `!${iid}`, a: es[0]?.seq ?? 0, b: lastSeq(es), mr: iid }));
  return { source: 'belay-ledger', entries: order.flatMap(([, es]) => entriesOf(es)), takes, holds: HOLDS };
}
