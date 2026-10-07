// Where an action class stands for the gate: which agent holds it and at what effective tier. The gate decides from
// this, and Belay's screens show it, so both read one rule: the lower of the tier-state record and the class ceiling,
// a lapsed hands-off lease reads supervised, no record reads quarantined, and no agent ever holds a human_only class.
// It fails closed: several holders with none named for the role is a refusal, never a guess.
import { TIER_ORDER, type Ceiling, type Tier, type TierRecord, type TierState } from '../../src/schemas/tier';

export type Standing =
  | { kind: 'unknown_class'; why: string }
  | { kind: 'human_only'; why: string }
  /** Several agents hold the class and none is named for its role: the gate will not pick one. */
  | { kind: 'refused'; holders: string[]; why: string }
  /** No agent holds the class (or the named agent has no record): not trusted. */
  | { kind: 'no_record'; agent: string | null; why: string }
  | { kind: 'held'; agent: string; record: TierRecord; ceiling: Tier; tier: Tier; leaseLapsed: boolean };

/** The agent whose record counts: the one given, the only holder, or the unique holder whose name includes the role. */
export function findHolder(state: TierState, classId: string, role: string, agent?: string): { agent: string | null; holders: string[]; why?: string } {
  const holders = Object.entries(state.agents).filter(([, classes]) => classId in classes).map(([a]) => a);
  if (agent) return { agent, holders };
  if (holders.length === 1) return { agent: holders[0] ?? null, holders };
  const named = holders.filter((a) => a.includes(role));
  if (named.length === 1) return { agent: named[0] ?? null, holders };
  return {
    agent: null, holders,
    why: holders.length === 0 ? `no agent in tier-state holds ${classId}` : `several agents hold ${classId} (${holders.join(', ')}), pass --agent`,
  };
}

const lower = (a: Tier, b: Tier): Tier => (TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b);

/** The tier a record grants under a ceiling at `now`. */
export function effectiveOf(record: Pick<TierRecord, 'tier' | 'lease_expires'>, ceiling: Tier, now: Date): { tier: Tier; leaseLapsed: boolean } {
  const tier = lower(record.tier, ceiling);
  const leaseLapsed = tier === 'hands_off' && !!record.lease_expires && +new Date(record.lease_expires) < +now;
  return { tier: leaseLapsed ? 'supervised' : tier, leaseLapsed }; // a lapsed grant falls to supervised until a person re-confirms it
}

export function standingOf(
  classes: Readonly<Record<string, { agent: string; ceiling: Ceiling }>>, state: TierState, classId: string, now: Date, agent?: string,
): Standing {
  const cls = classes[classId];
  if (!cls) return { kind: 'unknown_class', why: `unknown action class "${classId}"` };
  if (cls.ceiling === 'human_only') return { kind: 'human_only', why: `${classId} is human_only: a person acts, the gate never does` };
  const h = findHolder(state, classId, cls.agent, agent);
  if (!h.agent && h.holders.length > 1) return { kind: 'refused', holders: h.holders, why: h.why ?? '' };
  const record = h.agent ? state.agents[h.agent]?.[classId] : undefined;
  if (!h.agent || !record) {
    return { kind: 'no_record', agent: h.agent, why: h.why ?? `${h.agent ?? 'agent'} has no tier record for ${classId}; an unlisted class is not trusted` };
  }
  return { kind: 'held', agent: h.agent, record, ceiling: cls.ceiling, ...effectiveOf(record, cls.ceiling, now) };
}
