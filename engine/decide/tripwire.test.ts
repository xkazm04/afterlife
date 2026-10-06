import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { TIER_ORDER, type DemotionTrigger, type Tier } from '../../src/schemas/tier';
import { fixture, NOW, policy, ROOT } from '../__tests__/helpers';
import { parseState } from '../policy/load';
import { parseEvent, tripwire } from './tripwire';

const P = policy();
const STATE = fs.readFileSync(`${ROOT}/policy/tier-state.yml`, 'utf8');
const ev = (trigger: DemotionTrigger, over: Record<string, string> = {}) => parseEvent({ trigger, agent: 'ai-patcher-acme', class: 'code-fix.patch', at: '2026-10-21T14:20:05Z', ...over });
const stateWith = (tier: Tier) => STATE.replace(/code-fix\.patch: \{ tier: supervised/, `code-fix.patch: { tier: ${tier}`);

describe('tripwire triggers', () => {
  it.each<[DemotionTrigger, Tier, Tier]>([
    ['revert', 'supervised', 'assisted'],
    ['reopened_finding', 'supervised', 'assisted'],
    ['post_merge_proof_fail', 'hands_off', 'supervised'],
    ['default_branch_red_1h', 'supervised', 'assisted'],
    ['revert', 'assisted', 'quarantined'],
    ['guardrail_high', 'supervised', 'quarantined'],
    ['guardrail_high', 'hands_off', 'quarantined'],
    ['budget_breach_x2', 'assisted', 'quarantined'],
  ])('%s demotes %s to %s', (trigger, from, to) => {
    const r = tripwire(P, stateWith(from), 'policy/tier-state.yml', ev(trigger), NOW);
    expect(r.demote).toEqual({ agent: 'ai-patcher-acme', class: 'code-fix.patch', from, to, reason: trigger });
    expect(r.commit?.message).toMatch(new RegExp(`${from} -> ${to} \\(${trigger}\\)`));
  });

  it('does nothing to a class that is already quarantined', () => {
    const r = tripwire(P, stateWith('quarantined'), 'tier-state.yml', ev('revert'), NOW);
    expect(r).toMatchObject({ demote: null, commit: null });
    expect(r.note).toMatch(/already quarantined/);
  });

  it('does nothing for a trigger the policy does not list', () => {
    const quiet = { ...P, demotion: { one_step_on: [], quarantine_on: [] } };
    expect(tripwire(quiet, STATE, 'tier-state.yml', ev('revert'), NOW).demote).toBeNull();
  });

  it('never promotes: no trigger on any tier ends higher than it started', () => {
    for (const from of TIER_ORDER) {
      for (const trigger of ['revert', 'reopened_finding', 'post_merge_proof_fail', 'default_branch_red_1h', 'guardrail_high', 'budget_breach_x2'] as const) {
        const r = tripwire(P, stateWith(from), 'tier-state.yml', ev(trigger), NOW);
        if (r.demote) expect(TIER_ORDER.indexOf(r.demote.to)).toBeLessThan(TIER_ORDER.indexOf(from));
      }
    }
  });
});

describe('tripwire commit', () => {
  const r = tripwire(P, STATE, 'belay-policy/tier-state.yml', ev('guardrail_high', { evidence: '!44#note_5' }), NOW);
  const next = parseState(parse(r.commit?.content ?? ''));

  it('writes the new tier with who, why, evidence and a cooldown, and nothing else changes', () => {
    expect(next.agents['ai-patcher-acme']?.['code-fix.patch']).toEqual({ tier: 'quarantined', since: '2026-10-21', by: 'tripwire', reason: 'guardrail_high', evidence: '!44#note_5', cooldown_until: '2026-10-28' });
    expect(next.agents['ai-patcher-acme']?.['dep-bump.patch']).toEqual(parseState(parse(STATE)).agents['ai-patcher-acme']?.['dep-bump.patch']);
    expect(next.policy_sha).toBe('a1b2c3');
  });

  it('keeps the file as a person wrote it: comments, flow style, quoted dates', () => {
    const content = r.commit?.content ?? '';
    expect(content).toContain('# tier-state.yml - where each agent');
    expect(content).toMatch(/code-fix\.patch: \{ tier: quarantined, since: "2026-10-21", by: tripwire, reason: guardrail_high, evidence: "!44#note_5", cooldown_until: "2026-10-28" \}/);
    expect(content).toContain('dep-bump.patch: { tier: supervised, since: "2026-10-09", by: "start tier + record" }');
  });

  it('commits to the state file name, with a message that says what and why', () => {
    expect(r.commit?.path).toBe('tier-state.yml');
    expect(r.commit?.message.split('\n')[0]).toBe('tripwire: code-fix.patch supervised -> quarantined (guardrail_high)');
    expect(r.commit?.message).toContain('Evidence: !44#note_5');
    expect(r.commit?.message).toContain('Cooldown until: 2026-10-28');
  });

  it('drops a hands-off lease when it demotes, and uses the clock when the event has no time', () => {
    const leased = STATE.replace('code-fix.patch: { tier: supervised, since: "2026-10-09", by: "start tier + record" }', 'code-fix.patch: { tier: hands_off, since: "2026-10-09", by: "x", lease_expires: "2026-10-23" }');
    const out = tripwire(P, leased, 'tier-state.yml', parseEvent({ trigger: 'revert', agent: 'ai-patcher-acme', class: 'code-fix.patch' }), NOW);
    expect(out.commit?.content).not.toContain('lease_expires');
    expect(out.commit?.content).toContain('since: "2026-10-21"');
  });
});

describe('tripwire input', () => {
  it('parses an event file and rejects a trigger that is not a demotion trigger', () => {
    expect(parseEvent(fixture('events', 'revert.json'))).toMatchObject({ trigger: 'revert', class: 'code-fix.patch' });
    expect(() => parseEvent({ trigger: 'promote', agent: 'a', class: 'c' })).toThrow(/not a demotion trigger/);
    expect(() => parseEvent({ trigger: 'revert', agent: 'a' })).toThrow(/event.class/);
  });
  it('rejects an agent or class that tier-state does not know, and a bad time', () => {
    expect(() => tripwire(P, STATE, 's.yml', ev('revert', { agent: 'ghost' }), NOW)).toThrow(/no record/);
    expect(() => tripwire(P, STATE, 's.yml', ev('revert', { class: 'ghost.class' }), NOW)).toThrow(/no record/);
    expect(() => tripwire(P, STATE, 's.yml', ev('revert', { at: 'yesterday' }), NOW)).toThrow(/valid time/);
    expect(() => tripwire(P, 'version: 1\nagents: [', 's.yml', ev('revert'), NOW)).toThrow(/valid YAML/);
  });
});
