// Where each action class stands: trust-policy.yml (ceilings, order) + tier-state.yml (records) -> trust_class and
// class_tier rows. Mirrors the gate (engine/decide/gate.ts): the effective tier is the lower of the recorded tier and the
// class ceiling, a lapsed hands-off lease counts as supervised, and a class with no record is not trusted (quarantined).
// What GitLab cannot tell Belay (the record's counters, a moves note) is kept from the row already in the index.
import { TIER_ORDER, type Ceiling, type DemotionTrigger, type Tier, type TierRecord, type TierState } from '@/schemas/tier';
import type { ClassTierRow } from '@/server/index/repositories/fleet/classTier';
import type { TrustClassRow } from '@/server/index/repositories/fleet/taxonomy';
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

/** The move already in the index, except the notes this function writes itself: they last only while their cause does. */
const OWN_NOTE = /^(no tier record|lease lapsed)/;
const keptMove = (prev: ClassTierRow | undefined): ClassTierRow['move'] =>
  prev?.move && !(prev.move.kind === 'note' && OWN_NOTE.test(prev.move.note ?? '')) ? prev.move : null;

const lower = (a: Tier, b: Tier): Tier => (TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b);
const when = (s: string | undefined): Date | null => {
  const t = s ? Date.parse(s) : Number.NaN;
  return Number.isNaN(t) ? null : new Date(t);
};

/** The agent and record that hold a class: the agent named for its role, else the most restrictive holder (fail closed). */
export function holderOf(state: TierState, classId: string, role: string): { agent: string; record: TierRecord } | null {
  const held = Object.entries(state.agents).flatMap(([agent, classes]) => (classes[classId] ? [{ agent, record: classes[classId] as TierRecord }] : []));
  const named = held.filter((h) => h.agent.includes(`-${role}-`) || h.agent.endsWith(`-${role}`));
  const pool = named.length > 0 ? named : held;
  return pool.reduce<{ agent: string; record: TierRecord } | null>(
    (a, h) => (a === null || TIER_ORDER.indexOf(h.record.tier) < TIER_ORDER.indexOf(a.record.tier) ? h : a), null);
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
    const rec = c.ceiling === 'human_only' ? null : (holderOf(state, id, c.agent)?.record ?? null);
    const since = when(rec?.since);
    const lease = when(rec?.lease_expires);
    let tier: Ceiling;
    let move = keptMove(prev);
    if (c.ceiling === 'human_only') tier = 'human_only';
    else if (!rec) {
      tier = 'quarantined';
      move = { kind: 'note', at: null, note: 'no tier record: not trusted' };
    } else {
      tier = lower(rec.tier, c.ceiling);
      if (tier === 'hands_off' && lease !== null && lease.getTime() < now.getTime()) {
        tier = 'supervised';
        move = { kind: 'note', at: lease, note: 'lease lapsed: supervised' };
      } else if (rec.by.startsWith('tripwire')) move = { kind: 'tripwire', at: since, note: null };
      else if (/promotion/i.test(rec.by)) move = { kind: 'promoted', at: since, note: null };
      if (rec.by.startsWith('tripwire') && tier === 'quarantined') {
        quarantines.push({ classId: id, role: c.agent, track, reason: rec.reason ?? null, evidence: rec.evidence ?? null, since });
      }
    }
    rows.push({ projectId, classId: id, tier, since, setBy: rec?.by ?? null, leaseExpires: lease, record: prev?.record ?? null, move });
  });
  const cutoff = now.getTime() - windowMs;
  const demotions = Object.values(state.agents)
    .flatMap((classes) => Object.values(classes))
    .filter((r) => r.by.startsWith('tripwire') && (when(r.since)?.getTime() ?? 0) >= cutoff).length;
  return { classes, rows, demotions, quarantines };
}
