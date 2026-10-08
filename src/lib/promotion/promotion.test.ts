import { describe, expect, it } from 'vitest';
import { repoPolicy } from '@/server/data/policy';
import type { PolicyRules } from '@/server/data/types';
import { HUMAN_KEY, isEligible, pct, promotion, whyNot, type Counters, type PromotionSubject } from '.';

// The thresholds are policy/trust-policy.yml's, read the way the server reads them for the screen.
const RULES = repoPolicy() as PolicyRules;
const rec = (o: Partial<Counters> = {}) => ({ accepted: 9, needed: 15, noEdit: 1, cleanDays: 6, reverts: 0, ...o });
const subject = (o: Partial<Pick<PromotionSubject, 'tier' | 'ceiling' | 'record' | 'ask'>>) => ({
  tier: 'supervised' as const,
  ceiling: 'hands_off' as const,
  record: rec(),
  ...o,
});

describe('promotion', () => {
  it('reads its thresholds from trust-policy.yml', () => {
    expect(RULES).toMatchObject({ toSupervised: { accepted: 5, reverts: 0 }, toHandsOff: { accepted: 15, noEditRatio: 0.9, cleanDays: 14 } });
  });
  it('counts the Hands-off rules and says not yet', () => {
    const p = promotion(subject({}), 'repro', RULES);
    expect(p.kind).toBe('notyet');
    if (p.kind !== 'notyet') return;
    expect(p.next).toBe('hands_off');
    expect(p.rules.map((r) => r.met)).toEqual([false, true, false, true, true]); // human_key is a precondition, not a row
    expect(p.rules[0]).toMatchObject({ value: '9 / 15', cells: [9, 15] });
    expect(p.rules[1]?.name).toBe('merged without edits ≥ 90 %');
    expect(p.rules[2]).toMatchObject({ value: '6 / 14', cells: [6, 14] });
  });
  it('is eligible when every rule is met', () => {
    const p = promotion(subject({ record: rec({ accepted: 16, cleanDays: 14, noEdit: 0.94 }) }), 'exploit-test', RULES);
    expect(isEligible(p)).toBe(true);
  });
  it('needs a mechanical proof class for Hands-off', () => {
    const r = rec({ accepted: 16, cleanDays: 14 });
    expect(promotion(subject({ record: r }), 'human-review', RULES).kind).toBe('notyet');
  });
  it('counts against the policy, whatever the record says it needs', () => {
    const p = promotion(subject({ record: rec({ accepted: 14, needed: null, cleanDays: 14 }) }), 'repro', RULES);
    expect(p.kind === 'notyet' && p.rules[0]?.value).toBe('14 / 15');
    const stricter = { ...RULES, toHandsOff: { accepted: 20, noEditRatio: 0.95, cleanDays: 21, humanKey: false } };
    const q = promotion(subject({ record: rec({ accepted: 16, cleanDays: 14, noEdit: 0.94 }) }), 'exploit-test', stricter);
    expect(q.kind === 'notyet' && q.rules.map((r) => r.value)).toEqual(['16 / 20', '94 %', '14 / 21', '0', 'exploit-test']);
  });
  it('Assisted to Supervised needs the policy’s accepted count and reverts', () => {
    const ok = promotion(subject({ tier: 'assisted', record: rec({ accepted: 5, guardrailBlocks: 0, window: 5 }) }), 'repro', RULES);
    expect(ok.kind).toBe('eligible');
    expect(ok.kind === 'eligible' && ok.next).toBe('supervised');
    const bad = promotion(subject({ tier: 'assisted', record: rec({ accepted: 5, reverts: 1, guardrailBlocks: 0, window: 5 }) }), 'repro', RULES);
    expect(bad.kind).toBe('notyet');
  });
  it('without a policy it draws no counts, and says why', () => {
    expect(promotion(subject({}), 'repro', null)).toEqual({ kind: 'nopolicy', next: 'hands_off' });
  });
  it('has no promotion for the special cases', () => {
    expect(promotion(subject({ tier: 'human_only', ceiling: 'human_only', record: null }), 'x', RULES).kind).toBe('never');
    expect(promotion(subject({ tier: 'quarantined' }), 'x', RULES).kind).toBe('readmit');
    expect(promotion(subject({ tier: 'hands_off' }), 'x', RULES).kind).toBe('ceiling');
    expect(promotion(subject({ ceiling: 'supervised' }), 'x', RULES).kind).toBe('ceiling');
    expect(promotion(subject({ record: null }), 'x', RULES).kind).toBe('unknown');
  });
  it('formats a ratio as a percentage', () => {
    expect(pct(0.94)).toBe('94 %');
    expect(pct(1)).toBe('100 %');
  });
});

describe('counters a live record does not know', () => {
  it('reads a null counter as not recorded and never met, and the status line names it', () => {
    const p = promotion(subject({ record: rec({ accepted: 16, cleanDays: 14, noEdit: null }) }), 'exploit-test', RULES);
    expect(p.kind).toBe('notyet');
    if (p.kind !== 'notyet') return;
    expect(p.rules[1]).toEqual({ name: 'merged without edits ≥ 90 %', value: 'not recorded', met: false });
    expect(whyNot(p)).toBe('merged without edits ≥ 90 % is not recorded: no task or ledger event states it');
  });
  it('names the first unmet rule with its count', () => {
    const p = promotion(subject({ tier: 'assisted', ceiling: 'supervised', record: rec({ accepted: 3, noEdit: null }) }), 'repro', RULES);
    expect(whyNot(p)).toBe('accepted outputs is not met (3 / 5)');
  });
  it("a live promotion ask carries the poll's counts: eligible from the tier it was counted at only", () => {
    const ask = { id: 'promote:p:c', from: 'assisted' as const, to: 'supervised' as const, rules: [['accepted outputs', '5 / 5', true], ['reverts', '0', true]] as const };
    const p = promotion(subject({ tier: 'assisted', ceiling: 'supervised', record: null, ask }), 'repro', RULES);
    expect(p).toEqual({ kind: 'eligible', next: 'supervised', rules: [{ name: 'accepted outputs', value: '5 / 5', met: true }, { name: 'reverts', value: '0', met: true }], precondition: HUMAN_KEY });
    expect(promotion(subject({ tier: 'supervised', record: null, ask }), 'repro', RULES).kind).toBe('unknown');
  });
});
