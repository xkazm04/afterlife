import { describe, expect, it } from 'vitest';
import { append, verifyChain, type LedgerEvent } from './ledger';
import { verdictOf, type Check } from './proof';
import { demote, type TrustPolicy } from './tier';
import { due } from './cra';
import { stagesWithEvidence, type StageCell } from './stages';

const check = (ok: boolean | null): Check => ({ claim_id: null, name: 'c', ok, detail: '' });

describe('proof verdict', () => {
  it('passes only when every check passes inside the envelope', () => {
    expect(verdictOf([check(true), check(true)], true)).toBe('pass');
    expect(verdictOf([check(true), check(false)], true)).toBe('fail');
    expect(verdictOf([check(true), check(null)], true)).toBe('inconclusive');
    expect(verdictOf([check(true)], false)).toBe('fail');
    expect(verdictOf([], true)).toBe('inconclusive');
  });
});

describe('ledger chain', () => {
  const base = {
    at: '2026-10-09T09:27:00Z', agent: 'ai-patcher-acme', action_class: 'dep-bump.patch', kind: 'proof_verdict' as const,
    tier_at_time: 'supervised' as const, subject: { project_id: 1, type: 'mr' as const, iid: 41 },
    payload_ref: 'proofs/01J8Q4.json', observed_by: 'poll' as const,
  };
  it('verifies an untouched chain and finds the first tampered link', () => {
    let chain: LedgerEvent[] = [];
    for (let i = 0; i < 3; i++) chain = [...chain, append(chain, base)];
    expect(verifyChain(chain)).toBeNull();
    const tampered = chain.map((e) => (e.seq === 2 ? { ...e, tier_at_time: 'hands_off' as const } : e));
    expect(verifyChain(tampered)).toBe(2);
  });
});

describe('demotion', () => {
  const policy = {
    demotion: { one_step_on: ['revert', 'reopened_finding'], quarantine_on: ['guardrail_high'] },
  } as unknown as TrustPolicy;
  it('steps down one tier, quarantines on a guardrail high, and never promotes', () => {
    expect(demote('hands_off', 'revert', policy)).toBe('supervised');
    expect(demote('supervised', 'guardrail_high', policy)).toBe('quarantined');
    expect(demote('quarantined', 'revert', policy)).toBe('quarantined');
    expect(demote('assisted', 'budget_breach_x2', policy)).toBe('assisted');
  });
});

describe('CRA clock', () => {
  it('derives the 24 h, 72 h and 14-day deadlines', () => {
    const d = due('vulnerability', new Date('2026-10-18T10:00:00Z'), new Date('2026-10-19T10:00:00Z'));
    expect(d.early_warning.toISOString()).toBe('2026-10-19T10:00:00.000Z');
    expect(d.notification.toISOString()).toBe('2026-10-21T10:00:00.000Z');
    expect(d.final?.toISOString()).toBe('2026-11-02T10:00:00.000Z');
    expect(due('vulnerability', new Date()).final).toBeNull();
  });
});

describe('stage grid', () => {
  it('never counts unknown or evidence-less cells', () => {
    const cell = (rung: StageCell['rung'], n: number): StageCell => ({
      stage: 'secure', rung, depth: 'deep', evidence: Array.from({ length: n }, () => ({ label: 'x', url: 'u' })),
      tracks: [1], engine_version: 'v1', scanned_at: '',
    });
    expect(stagesWithEvidence([cell('running', 1), cell(null, 1), cell('configured', 0), cell('absent', 1)])).toBe(1);
  });
});
