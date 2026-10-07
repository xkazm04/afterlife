// Where each action class stands: trust-policy.yml (ceilings, order) + tier-state.yml (records) -> trust_class and
// class_tier rows. The holder and the effective tier come from the gate's own rule (engine/decide/standing.ts), so a row
// never shows a tier the gate would not grant. A class no agent holds is stored quarantined with move 'no_record'; a class
// several agents hold with none named for the role is stored quarantined with move 'refused' (the gate blocks both).
// What GitLab cannot tell Belay (the record's counters, a moves note) is kept from the row already in the index.
import type { Ceiling, DemotionTrigger, TierRecord, TierState } from '@/schemas/tier';
import type { ClassTierRow } from '@/server/index/repositories/fleet/classTier';
import type { TrustClassRow } from '@/server/index/repositories/fleet/taxonomy';
import { findHolder, standingOf } from '../../../../engine/decide/standing';
import type { EnginePolicy } from '../../../../engine/policy/load';

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
}

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

/** The agent and record that hold a class, by the gate's rule (engine/decide/standing.ts); null when the gate would find none. */
export function holderOf(state: TierState, classId: string, role: string): { agent: string; record: TierRecord } | null {
  const { agent } = findHolder(state, classId, role);
  const record = agent ? state.agents[agent]?.[classId] : undefined;
  return agent && record ? { agent, record } : null;
}

/** The classes in the policy's order, with the track their agent role belongs to. */
export const trustClassesOf = (policy: EnginePolicy): TrustClassRow[] =>
  Object.entries(policy.classes).map(([id, c], ord) => ({ id, ord, track: ROLE_TRACK[c.agent] ?? null, agent: c.agent, ceiling: c.ceiling }));

export function deriveTiers(
  policy: EnginePolicy, state: TierState, projectId: string, now: Date, existing: ReadonlyMap<string, ClassTierRow>, windowMs: number,
): TierDerivation {
  const classes = trustClassesOf(policy);
  const rows: ClassTierRow[] = [];
  const quarantines: Quarantine[] = [];
  Object.entries(policy.classes).forEach(([id, c]) => {
    const track = ROLE_TRACK[c.agent] ?? null;
    const prev = existing.get(id);
    const st = standingOf(policy.classes, state, id, now);
    const rec = st.kind === 'held' ? st.record : null;
    const since = when(rec?.since);
    const lease = when(rec?.lease_expires);
    let tier: Ceiling;
    let move = keptMove(prev);
    if (st.kind === 'held') {
      tier = st.tier;
      if (st.leaseLapsed) move = { kind: 'note', at: lease, note: 'lease lapsed: supervised' };
      else if (st.record.by.startsWith('tripwire')) move = { kind: 'tripwire', at: since, note: st.record.reason ?? null }; // the trigger
      else if (/promotion/i.test(st.record.by)) move = { kind: 'promoted', at: since, note: null };
      if (st.record.by.startsWith('tripwire') && tier === 'quarantined') {
        quarantines.push({ classId: id, role: c.agent, track, reason: st.record.reason ?? null, evidence: st.record.evidence ?? null, since });
      }
    } else if (st.kind === 'refused') {
      tier = 'quarantined'; // the gate grants nothing: it blocks until one holder is named
      move = { kind: 'refused', at: null, note: st.holders.join(', ') };
    } else if (st.kind === 'no_record') {
      tier = 'quarantined';
      move = { kind: 'no_record', at: null, note: null };
    } else tier = 'human_only';
    rows.push({ projectId, classId: id, tier, since, setBy: rec?.by ?? null, leaseExpires: lease, record: prev?.record ?? null, move });
  });
  const cutoff = now.getTime() - windowMs;
  const demotions = Object.values(state.agents)
    .flatMap((classes) => Object.values(classes))
    .filter((r) => r.by.startsWith('tripwire') && (when(r.since)?.getTime() ?? 0) >= cutoff).length;
  return { classes, rows, demotions, quarantines };
}
