// What belay-apply's gate decided for a class's holder, read from the imported ledger. The gate writes a tier_decision
// event only when the engine decided it (gitlab/components/scripts/decide/apply-gate.mjs: a forced run writes only its
// guardrail_verdict, and sweep.mjs forces a wait when it cannot derive a Proof Block), so a tier_decision for an MR says
// the gate derived a proof for it and decided. Ledger events are durable (hash-chained, imported per project), unlike
// proof rows, which exist only for MRs inside the task window: so this reads the ledger, never the proofs.
import type { GateSeen } from '@/lib/demo/types';
import type { CounterSource, CountedEvent, Holder } from './counters';

const decided = (e: CountedEvent, h: Pick<Holder, 'agent' | 'classId'>): boolean =>
  e.kind === 'tier_decision' && e.agent === h.agent && e.action_class === h.classId && e.subject.type === 'mr';

/**
 * The MRs belay-apply's gate decided for the holder: a tier_decision event for the same agent, class and MR in the imported
 * chain, whenever the gate wrote it. The gated outputs are the counted merged outputs among them (./counters.ts). Null when
 * this poll did not read the ledger (`ledgerRead`, as the guardrail blocks read it): an event it did not import may be
 * the one that gated an output, so nothing is stated.
 */
export function gatedSetOf(src: CounterSource, h: Pick<Holder, 'agent' | 'classId'>): Set<number> | null {
  if (!src.ledgerRead) return null;
  return new Set(src.events.filter((e) => decided(e, h)).map((e) => e.subject.iid));
}

/**
 * The gate last seen deciding for the holder: the latest tier_decision for its agent and class at or after the record's
 * since (a later event wins a tie, as the chain orders them). Null when there is none, or no since to read it from.
 */
export function gateSeenOf(events: readonly CountedEvent[], h: Pick<Holder, 'agent' | 'classId' | 'since'>): GateSeen | null {
  if (!h.since) return null;
  const from = h.since.getTime();
  let best: { at: number; e: CountedEvent } | null = null;
  for (const e of events) {
    const at = Date.parse(e.at);
    if (!decided(e, h) || !e.tier_at_time || Number.isNaN(at) || at < from) continue;
    if (!best || at >= best.at) best = { at, e };
  }
  if (!best || !best.e.tier_at_time) return null;
  return { iid: best.e.subject.iid, tierAtTime: best.e.tier_at_time, at: new Date(best.at).toISOString() };
}
