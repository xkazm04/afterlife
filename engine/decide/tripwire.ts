// The tripwire: restricting is free, so it needs no human. An event in, a demotion out, as the new
// tier-state.yml content and a commit message. It only ever lowers a tier (src/schemas/tier.ts demote());
// promotion is a person's policy MR. The YAML is edited in place so comments and layout survive.
import { parseDocument, Scalar, YAMLMap } from 'yaml';
import { demote, TIER_ORDER, type DemotionTrigger, type Tier } from '../../src/schemas/tier';
import { EngineError, optStr, rec, str } from '../core/types';
import { parseState, type EnginePolicy } from '../policy/load';

const TRIGGERS: readonly DemotionTrigger[] = ['revert', 'reopened_finding', 'post_merge_proof_fail', 'default_branch_red_1h', 'guardrail_high', 'budget_breach_x2'];

export interface TripwireEvent {
  trigger: DemotionTrigger;
  agent: string;
  class: string;
  at?: string;
  evidence?: string;
}

export interface TripwireResult {
  demote: { agent: string; class: string; from: Tier; to: Tier; reason: DemotionTrigger } | null;
  commit: { path: string; content: string; message: string } | null;
  note: string;
}

export function parseEvent(raw: unknown): TripwireEvent {
  const e = rec(raw, 'event');
  const trigger = str(e.trigger, 'event.trigger');
  if (!TRIGGERS.includes(trigger as DemotionTrigger)) throw new EngineError(`event.trigger "${trigger}" is not a demotion trigger`);
  return { trigger: trigger as DemotionTrigger, agent: str(e.agent, 'event.agent'), class: str(e.class, 'event.class'), at: optStr(e.at, 'event.at'), evidence: optStr(e.evidence, 'event.evidence') };
}

const day = (d: Date): string => d.toISOString().slice(0, 10);

export function tripwire(policy: EnginePolicy, stateText: string, statePath: string, event: TripwireEvent, now: Date): TripwireResult {
  const doc = parseDocument(stateText);
  if (doc.errors.length) throw new EngineError(`tier-state.yml is not valid YAML: ${doc.errors[0]?.message}`);
  const state = parseState(doc.toJS());
  const current = state.agents[event.agent]?.[event.class];
  if (!current) throw new EngineError(`tier-state has no record for ${event.agent} / ${event.class}`);
  const to = demote(current.tier, event.trigger, policy);
  if (TIER_ORDER.indexOf(to) >= TIER_ORDER.indexOf(current.tier)) {
    const why = current.tier === 'quarantined' ? 'already quarantined' : `${event.trigger} does not demote ${current.tier}`;
    return { demote: null, commit: null, note: `no change: ${why}` };
  }

  const at = event.at ? new Date(event.at) : now;
  if (Number.isNaN(+at)) throw new EngineError('event.at is not a valid time');
  const since = day(at);
  const cooldown = day(new Date(+at + policy.cooldown_days * 86_400_000));
  const record: Record<string, string> = { tier: to, since, by: 'tripwire', reason: event.trigger, ...(event.evidence ? { evidence: event.evidence } : {}), cooldown_until: cooldown };
  const node = doc.createNode(record) as YAMLMap;
  node.flow = true;
  for (const pair of node.items) {
    if (pair.value instanceof Scalar && typeof pair.value.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pair.value.value)) pair.value.type = 'QUOTE_DOUBLE';
  }
  doc.setIn(['agents', event.agent, event.class], node);

  const path = statePath.split(/[\\/]/).at(-1) ?? 'tier-state.yml';
  const message = [
    `tripwire: ${event.class} ${current.tier} -> ${to} (${event.trigger})`,
    '',
    `Agent: ${event.agent}`,
    `Trigger: ${event.trigger}`,
    ...(event.evidence ? [`Evidence: ${event.evidence}`] : []),
    `Cooldown until: ${cooldown}`,
    'Demoted by the model-free tripwire. Promotion needs a person.',
  ].join('\n');
  return {
    demote: { agent: event.agent, class: event.class, from: current.tier, to, reason: event.trigger },
    commit: { path, content: doc.toString({ lineWidth: 0 }), message },
    note: `${event.agent} / ${event.class}: ${current.tier} -> ${to}`,
  };
}
