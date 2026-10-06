// The tier gate: merge | approve | wait | block, from structured data only (tier-state, trust-policy, the
// proof verdict, the guardrail verdict, the envelope). Nothing is read from free text. It fails closed:
// anything unknown, mismatched or unproven is a block or a wait, never a merge.
import { verdictOf, type ProofBlock } from '../../src/schemas/proof';
import { TIER_ORDER, type Tier, type TierState } from '../../src/schemas/tier';
import type { EnvelopeResult } from '../policy/envelope';
import type { EnginePolicy } from '../policy/load';

export type Decision = 'merge' | 'approve' | 'wait' | 'block';

export interface GuardrailVerdict {
  verdict: string; // 'pass' | 'block'; anything else is treated as not yet known
  severity?: string;
}

export interface GateInput {
  policy: EnginePolicy;
  state: TierState;
  classId: string;
  agent?: string;
  proof?: ProofBlock;
  guardrail?: GuardrailVerdict;
  envelope?: EnvelopeResult; // set when the gate was given the diff to measure itself
  now: Date;
  engineSha?: string; // when set, the proof must have been made by exactly this engine
}

export interface GateResult {
  decision: Decision;
  tier: Tier | null; // effective tier: the lower of the recorded tier and the class ceiling
  state_tier: Tier | null;
  class: string;
  agent: string | null;
  reasons: string[];
}

const lower = (a: Tier, b: Tier): Tier => (TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b);

function findAgent(g: GateInput): { agent: string | null; why?: string } {
  if (g.agent) return { agent: g.agent };
  const holders = Object.entries(g.state.agents).filter(([, classes]) => g.classId in classes).map(([a]) => a);
  if (holders.length === 1) return { agent: holders[0] ?? null };
  const role = g.policy.classes[g.classId]?.agent ?? '';
  const named = holders.filter((a) => a.includes(role));
  if (named.length === 1) return { agent: named[0] ?? null };
  return { agent: null, why: holders.length === 0 ? `no agent in tier-state holds ${g.classId}` : `several agents hold ${g.classId} (${holders.join(', ')}), pass --agent` };
}

export function gate(g: GateInput): GateResult {
  const blocks: string[] = [];
  const waits: string[] = [];
  const cls = g.policy.classes[g.classId];
  const out = (decision: Decision, tier: Tier | null, stateTier: Tier | null, agent: string | null, reasons: string[]): GateResult => ({
    decision, tier, state_tier: stateTier, class: g.classId, agent, reasons,
  });

  if (!cls) return out('block', null, null, null, [`unknown action class "${g.classId}"`]);
  if (cls.ceiling === 'human_only') return out('block', null, null, null, [`${g.classId} is human_only: a person acts, the gate never does`]);
  const { agent, why } = findAgent(g);
  const record = agent ? g.state.agents[agent]?.[g.classId] : undefined;
  if (!agent || !record) return out('block', null, null, agent, [why ?? `${agent ?? 'agent'} has no tier record for ${g.classId}; an unlisted class is not trusted`]);

  let tier = lower(record.tier, cls.ceiling);
  const leaseLapsed = tier === 'hands_off' && !!record.lease_expires && +new Date(record.lease_expires) < +g.now;
  if (leaseLapsed) tier = 'supervised'; // a lapsed grant falls to supervised until a person re-confirms it
  const notes: string[] = [];
  if (tier !== record.tier) {
    notes.push(`effective tier ${tier}: recorded ${record.tier}, class ceiling ${cls.ceiling}${leaseLapsed ? `, lease expired ${record.lease_expires}` : ''}`);
  }
  if (tier === 'quarantined') blocks.push('quarantined: read, comment and label only');

  if (!g.guardrail) waits.push('no guardrail verdict yet');
  else if (g.guardrail.verdict === 'block') blocks.push(`guardrail blocked${g.guardrail.severity ? ` (${g.guardrail.severity})` : ''}`);
  else if (g.guardrail.verdict !== 'pass') waits.push(`guardrail verdict "${g.guardrail.verdict}" is not a pass`);

  const p = g.proof;
  if (!p) waits.push('no proof block yet');
  else {
    if (cls.proof && p.class !== cls.proof) blocks.push(`${g.classId} needs a ${cls.proof} proof, got ${p.class}`);
    const derived = verdictOf(p.checks, p.envelope.within);
    if (derived !== p.verdict) blocks.push(`proof says ${p.verdict} but its checks give ${derived}`);
    if (g.engineSha && p.engine.sha256 !== g.engineSha) blocks.push('the proof was made by a different engine build than this gate');
    if (derived === 'fail') blocks.push('proof failed');
    else if (derived === 'inconclusive') waits.push('proof is inconclusive');
    if (!p.envelope.within) blocks.push('the change is outside the envelope');
  }
  if (g.envelope && !g.envelope.within) blocks.push(`envelope: ${g.envelope.violations.join('; ')}`);

  const reasons = [...notes, ...blocks, ...waits];
  if (blocks.length) return out('block', tier, record.tier, agent, reasons);
  if (waits.length) return out('wait', tier, record.tier, agent, reasons);
  if (tier === 'hands_off') return out('merge', tier, record.tier, agent, [...notes, 'hands-off: proof pass, guardrail pass, inside the envelope']);
  if (tier === 'supervised') return out('approve', tier, record.tier, agent, [...notes, 'supervised: checks pass, a human approver still merges']);
  return out('wait', tier, record.tier, agent, [...notes, 'assisted: a Code Owner approves and merges, the gate does not act']);
}
