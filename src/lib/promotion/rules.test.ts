// trust-policy.yml's three rules beyond the counts: guardrail_blocks and window_last on Assisted to Supervised, human_key on
// Supervised to Hands-off. Each is met, unmet, or not recorded (never met), and a greyed Promote names the first unmet one.
import { describe, expect, it } from 'vitest';
import { repoPolicy } from '@/server/data/policy';
import type { PolicyRules } from '@/server/data/types';
import { NOT_RECORDED, promotion, whyNot, type Counters } from '.';

const RULES = repoPolicy() as PolicyRules;
const rec = (o: Partial<Counters> = {}): Counters => ({ accepted: 5, needed: null, noEdit: null, cleanDays: 10, reverts: 0, guardrailBlocks: 0, window: 5, ...o });
const toSupervised = (o: Partial<Counters>, rules: PolicyRules = RULES) => promotion({ tier: 'assisted', ceiling: 'supervised', record: rec(o) }, 'exploit-test', rules);
const rule = (p: ReturnType<typeof promotion>, name: string) => (p.kind === 'eligible' || p.kind === 'notyet' ? p.rules.find((r) => r.name === name) : undefined);

describe('the policy sets them', () => {
  it('rulesOf reads guardrail_blocks, window_last and human_key from trust-policy.yml', () => {
    expect(RULES.toSupervised).toEqual({ accepted: 5, reverts: 0, guardrailBlocks: 0, windowLast: 5 });
    expect(RULES.toHandsOff).toEqual({ accepted: 15, noEditRatio: 0.9, cleanDays: 14, humanKey: true });
  });
});

describe('guardrail_blocks: 0', () => {
  it('met: the record states no guardrail block in its counts', () => {
    const p = toSupervised({});
    expect(p.kind).toBe('eligible');
    expect(rule(p, 'guardrail blocks')).toEqual({ name: 'guardrail blocks', value: '0', met: true });
  });
  it('unmet: one block, and Promote names it', () => {
    const p = toSupervised({ guardrailBlocks: 1 });
    expect([p.kind, rule(p, 'guardrail blocks')?.met, whyNot(p)]).toEqual(['notyet', false, 'guardrail blocks is not met (1)']);
  });
  it('not recorded: nothing states it (null, or a record that never says, as the demo fixture)', () => {
    for (const p of [toSupervised({ guardrailBlocks: null }), toSupervised({ guardrailBlocks: undefined })]) {
      expect([p.kind, rule(p, 'guardrail blocks')?.value]).toEqual(['notyet', NOT_RECORDED]);
      expect(whyNot(p)).toBe('guardrail blocks is not recorded: no task or ledger event states it');
    }
  });
});

describe('window_last: 5', () => {
  const name = 'counted over the last 5 outputs';
  it('met: the counts were taken over the last 5 outputs', () => {
    expect(rule(toSupervised({}), name)).toEqual({ name, value: 'last 5', met: true });
  });
  it('unmet: counted over another window (an older policy)', () => {
    const p = toSupervised({ window: 10 });
    expect([p.kind, whyNot(p)]).toEqual(['notyet', `${name} is not met (last 10)`]);
  });
  it('not recorded: the record does not say what its counts were taken over', () => {
    const p = toSupervised({ window: null });
    expect([p.kind, whyNot(p)]).toEqual(['notyet', `${name} is not recorded: no task or ledger event states it`]);
  });
  it('a policy that sets neither asks neither', () => {
    const loose = { ...RULES, toSupervised: { ...RULES.toSupervised, guardrailBlocks: null, windowLast: null } };
    const p = toSupervised({ guardrailBlocks: null, window: null }, loose);
    expect(p.kind === 'eligible' && p.rules.map((r) => r.name)).toEqual(['accepted outputs', 'reverts']);
  });
});

describe('human_key: true', () => {
  const name = 'a person merges the promotion MR (human key)';
  const toHandsOff = (rules: PolicyRules) =>
    promotion({ tier: 'supervised', ceiling: 'hands_off', record: rec({ accepted: 16, noEdit: 0.94, cleanDays: 14 }) }, 'exploit-test', rules);
  it('met by construction: Belay opens the policy MR and a person merges it', () => {
    const p = toHandsOff(RULES);
    expect([p.kind, rule(p, name)]).toEqual(['eligible', { name, value: 'policy MR', met: true }]);
  });
  it('a policy without it asks no human key', () => {
    expect(rule(toHandsOff({ ...RULES, toHandsOff: { ...RULES.toHandsOff, humanKey: false } }), name)).toBeUndefined();
  });
  it('never makes a class eligible on its own: the counts it sits beside still decide', () => {
    const p = promotion({ tier: 'supervised', ceiling: 'hands_off', record: rec({ accepted: 16, cleanDays: 14 }) }, 'exploit-test', RULES);
    expect([p.kind, whyNot(p)]).toEqual(['notyet', 'merged without edits ≥ 90 % is not recorded: no task or ledger event states it']);
  });
});
