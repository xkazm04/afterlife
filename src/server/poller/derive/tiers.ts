// Where each action class stands: trust-policy.yml (ceilings, order) + tier-state.yml (records) -> trust_class and
// class_tier rows. The holder and the effective tier come from the gate's own rule (engine/decide/standing.ts), so a row
// never shows a tier the gate would not grant. A class no agent holds is stored quarantined with move 'no_record' (the
// gate blocks it). A class several agents hold, one of them named for the role or none, is stored with move 'refused' and
// every holder at the tier gate({..., agent: holder}) grants: CI gates each MR at its author's own record. The row's
// tier is the most restrictive holder's. views/standing.ts writes and reads both standings.
// A class one agent holds gets its counters counted from the project's tasks and ledger (./counters.ts) when the caller
// passes them: stored on its row (each counter null where nothing states it) and returned beside the rows, for the
// promotion asks, with the gate last seen deciding for its holder (./gate.ts) and the outputs behind the counts (./sources.ts). What GitLab cannot tell Belay (a split or
// unheld class's stored counters, a moves note) is kept from the row already in the index. With tier-state.yml's history
// (../stateHistory.ts), a class one agent holds also gets the receipt of its record (./receipt.ts): where it was enforced.
// Without one, or for any other class, the receipt is null.
import type { Ceiling, DemotionTrigger, TierState } from '@/schemas/tier';
import type { ClassTierRow } from '@/server/index/repositories/fleet/classTier';
import type { TrustClassRow } from '@/server/index/repositories/fleet/taxonomy';
import { noRecordRow, splitRow } from '@/server/index/views/standing';
import { holderStandings, standingOf } from '../../../../engine/decide/standing';
import type { EnginePolicy } from '../../../../engine/policy/load';
import type { ClassCounters, CounterSource } from './counters';
import { receiptOf, type Enforcement } from './receipt';
import { gateSeenOf } from './gate';
import { recordOf } from './sources';

/** The eight tracks, by the agent role trust-policy.yml names. */
export const ROLE_TRACK: Readonly<Record<string, number>> = {
  patcher: 1, cra: 2, governor: 3, guardrail: 4, medic: 5, maturity: 6, qa: 7, gardener: 8,
};

/** A class a tripwire quarantined: the input of a re-admit proposal. */
export interface Quarantine {
  classId: string;
  role: string;
  track: number | null;
  reason: DemotionTrigger | null;
  evidence: string | null;
  since: Date | null;
}

export interface TierDerivation {
  classes: TrustClassRow[];
  rows: ClassTierRow[];
  /** Records the tripwire wrote within `windowMs` of `now`. */
  demotions: number;
  quarantines: Quarantine[];
  /** The classes one agent holds with a record, with their counters (all null when no source was passed). Also on `rows`. */
  held: Map<string, ClassCounters>;
}

const NO_SOURCE: CounterSource = { tasks: [], events: [], revertDemotes: false, ledgerRead: false };

/** trust-policy.yml's window_last: an assisted class's counts are taken over its holder's last that many outputs. */
const windowOf = (policy: EnginePolicy, tier: Ceiling): number | null => {
  const n = policy.promotion?.assisted_to_supervised?.window_last;
  return tier === 'assisted' && typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
};

/** The move already in the index, except the moves this function writes itself: they last only while their cause does. */
const keptMove = (prev: ClassTierRow | undefined): ClassTierRow['move'] => {
  const m = prev?.move;
  if (!m || m.kind === 'no_record' || m.kind === 'refused' || (m.kind === 'note' && /^lease lapsed/.test(m.note ?? ''))) return null;
  return m;
};

const when = (s: string | undefined): Date | null => {
  const t = s ? Date.parse(s) : Number.NaN;
  return Number.isNaN(t) ? null : new Date(t);
};

/** Who set a record, when it says so in text. The gate reads a record by its tier alone, so a hand-written one may lack it (F51). */
const byOf = (r: { by?: unknown } | null): string | null => (typeof r?.by === 'string' ? r.by : null);

/** The classes in the policy's order, with the track their agent role belongs to. */
/** The track of an agent role, null for a role the table does not name (a role is YAML text: 'constructor' is not a track). */
export const trackOfRole = (role: string): number | null => (Object.hasOwn(ROLE_TRACK, role) ? (ROLE_TRACK[role] ?? null) : null);

export const trustClassesOf = (policy: EnginePolicy): TrustClassRow[] =>
  Object.entries(policy.classes).map(([id, c], ord) => ({ id, ord, track: trackOfRole(c.agent), agent: c.agent, ceiling: c.ceiling }));

export function deriveTiers(
  policy: EnginePolicy, state: TierState, projectId: string, now: Date, existing: ReadonlyMap<string, ClassTierRow>, windowMs: number,
  counters?: CounterSource, enforce?: Enforcement | null,
): TierDerivation {
  const classes = trustClassesOf(policy);
  const rows: ClassTierRow[] = [];
  const quarantines: Quarantine[] = [];
  const held = new Map<string, ClassCounters>();
  Object.entries(policy.classes).forEach(([id, c]) => {
    const track = trackOfRole(c.agent);
    const prev = existing.get(id);
    const holders = holderStandings(policy.classes, state, id, now);
    const st = standingOf(policy.classes, state, id, now);
    const rec = st.kind === 'held' && holders.length < 2 ? st.record : null;
    const since = when(rec?.since);
    const lease = when(rec?.lease_expires);
    let tier: Ceiling;
    let move = keptMove(prev);
    if (holders.length > 1) {
      ({ tier, move } = splitRow(holders.map((h) => ({ agent: h.agent, tier: h.tier }))));
    } else if (st.kind === 'held') {
      tier = st.tier;
      if (st.leaseLapsed) move = { kind: 'note', at: lease, note: 'lease lapsed: supervised' };
      else if (byOf(st.record)?.startsWith('tripwire')) move = { kind: 'tripwire', at: since, note: st.record.reason ?? null }; // the trigger
      else if (/promotion/i.test(byOf(st.record) ?? '')) move = { kind: 'promoted', at: since, note: null };
      if (byOf(st.record)?.startsWith('tripwire') && tier === 'quarantined') {
        quarantines.push({ classId: id, role: c.agent, track, reason: st.record.reason ?? null, evidence: st.record.evidence ?? null, since });
      }
    } else if (st.kind === 'no_record') {
      ({ tier, move } = noRecordRow());
    } else tier = 'human_only'; // human_only (no agent ever holds it); 'refused' always has two holders, handled above
    let record = prev?.record ?? null;
    let sources = prev?.sources ?? null;
    let receipt: ClassTierRow['receipt'] = null;
    // the gate last seen for the one holder; a class several agents or none hold has no one holder to read it for
    let gateSeen = counters ? null : prev?.gateSeen ?? null;
    if (rec && st.kind === 'held') {
      const counted = recordOf(counters ?? NO_SOURCE, { agent: st.agent, classId: id, since: counters ? since : null, window: windowOf(policy, tier) }, now);
      held.set(id, counted.counters);
      if (counters) record = Object.values(counted.counters).some((v) => v !== null) ? counted.counters : null; // the poll's count replaces the stored one
      if (counters) sources = counted.sources; // and its list, from the same tally
      if (enforce) receipt = receiptOf({ agent: st.agent, classId: id, tier: st.record.tier, ceiling: c.ceiling, commits: enforce.history.commits, writer: enforce.history.writerOf(st.agent, id), events: enforce.events });
      if (counters) gateSeen = gateSeenOf(counters.events, { agent: st.agent, classId: id, since });
    }
    rows.push({ projectId, classId: id, tier, since, setBy: byOf(rec), leaseExpires: lease, record, move, cooldownUntil: when(rec?.cooldown_until), receipt, gateSeen, sources });
  });
  const cutoff = now.getTime() - windowMs;
  const demotions = Object.values(state.agents)
    .flatMap((classes) => Object.values(classes))
    .filter((r) => byOf(r)?.startsWith('tripwire') && (when(r.since)?.getTime() ?? 0) >= cutoff).length;
  return { classes, rows, demotions, quarantines, held };
}
