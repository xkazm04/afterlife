// The next rung, run as a shadow: what the same gate would decide for the same merge request if the holder's record stood
// one rung higher, under the class ceiling. It reads exactly the gate's inputs (the proof, the guardrail verdict, the
// envelope, the clock) with one change, a copy of tier-state in which that record is raised, and calls gate() again. The
// shadow is a statement for the ledger (a tier_decision's `would`), never a decision: nothing applies it, and it never
// changes what the real gate returns. No next rung (the record is at the top, or the rung above is over the ceiling, or
// no agent holds a record) is no shadow.
import { rungAbove, type LedgerWould } from '../../src/schemas/ledger';
import { TIER_ORDER, type Tier, type TierRecord, type TierState } from '../../src/schemas/tier';
import { gate, type GateInput } from './gate';
import { standingOf } from './standing';

/** tier-state with one record raised: a copy; the input is never touched. A fresh grant has no lease yet, so none lapses. */
function raised(state: TierState, agent: string, classId: string, held: TierRecord, tier: Tier): TierState {
  const { lease_expires: _lease, ...record } = held;
  void _lease;
  return { ...state, agents: { ...state.agents, [agent]: { ...state.agents[agent], [classId]: { ...record, tier } } } };
}

/** What the gate would decide one rung up, or null when there is no next rung for this merge request's holder. */
export function shadowNextRung(g: GateInput): LedgerWould | null {
  const st = standingOf(g.policy.classes, g.state, g.classId, g.now, g.agent);
  if (st.kind !== 'held') return null;
  const next = rungAbove(st.record.tier);
  if (!next || TIER_ORDER.indexOf(next) > TIER_ORDER.indexOf(st.ceiling)) return null;
  const r = gate({ ...g, agent: st.agent, state: raised(g.state, st.agent, g.classId, st.record, next) });
  return { tier: next, decision: r.decision };
}
