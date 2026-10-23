import { describe, expect, it, vi } from 'vitest';
import { append, canonical, LEDGER_KINDS, OBSERVERS, SUBJECT_TYPES, verifyChain, type LedgerEvent } from './ledger';
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

  it('ignores a check a human decides, but never an engine check that could not be determined', () => {
    const human = (ok: boolean | null): Check => ({ ...check(ok), decidedBy: 'human' });
    expect(verdictOf([check(true), human(null)], true)).toBe('pass');
    expect(verdictOf([check(true), human(false)], true)).toBe('pass');
    expect(verdictOf([check(false), human(null)], true)).toBe('fail');
    expect(verdictOf([check(null), human(true)], true)).toBe('inconclusive');
    expect(verdictOf([{ ...check(true), decidedBy: 'engine' }, human(null)], true)).toBe('pass');
    expect(verdictOf([check(true), human(null)], false)).toBe('fail');
  });

  it('has no verdict from human-decided checks alone', () => {
    expect(verdictOf([{ ...check(true), decidedBy: 'human' }], true)).toBe('inconclusive');
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

// The writer (engine/commands/ledger.ts) and the reader (src/server/ledger/parse.ts) both take these lists, so a kind one accepts
// and the other refuses cannot exist; the unions are derived from them, so a member cannot be in a type and not in a list.
describe('ledger vocabularies', () => {
  it('lists every kind, subject type and observer once', () => {
    expect([...LEDGER_KINDS]).toEqual(['task_started', 'proof_verdict', 'guardrail_verdict', 'tier_decision', 'merged', 'deployed', 'outcome', 'clock_event']);
    expect([...SUBJECT_TYPES]).toEqual(['mr', 'issue', 'pipeline', 'vulnerability', 'deployment']);
    expect([...OBSERVERS]).toEqual(['poll', 'flows_api', 'govern_hook', 'webhook', 'ci_job']);
    for (const l of [LEDGER_KINDS, SUBJECT_TYPES, OBSERVERS]) expect(new Set(l).size).toBe(l.length);
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

describe('canonical', () => {
  it('orders keys by UTF-16 code unit: upper case before lower case, as RFC 8785 does', () => {
    expect(canonical({ a: 1, B: 2, _c: 3, b1: 4 })).toBe('{"B":2,"_c":3,"a":1,"b1":4}');
  });
  it('never asks the host locale: a hostile localeCompare leaves the form (and so every hash) unchanged', () => {
    const v = { would: { decision: 'x', b: 1 }, observed_by: 'o', decision: 'd', action_class: 'a' };
    const want = canonical(v);
    const spy = vi.spyOn(String.prototype, 'localeCompare').mockImplementation(() => 1);
    try {
      expect(canonical(v)).toBe(want);
    } finally {
      spy.mockRestore();
    }
    expect(want).toBe('{"action_class":"a","decision":"d","observed_by":"o","would":{"b":1,"decision":"x"}}');
  });
});
