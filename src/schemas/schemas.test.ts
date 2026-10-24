import { describe, expect, it } from 'vitest';
import { append, LEDGER_KINDS, OBSERVERS, SUBJECT_TYPES, verifyChain, type LedgerEvent } from './ledger';
import { verdictOf, type Check } from './proof';
import { demote, type TrustPolicy } from './tier';
import { due } from './cra';
import { stagesWithEvidence, type StageCell } from './stages';
import { actsAlone, resolveTrial, trialCount, trialDecisions, type TrialEvent, type TrialResolution } from './trial';

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

describe('next-rung trial', () => {
  it('a shadow decision is a trial only where it acts alone: merge at hands_off, approve at supervised', () => {
    expect([actsAlone({ tier: 'hands_off', decision: 'merge' }), actsAlone({ tier: 'supervised', decision: 'approve' })]).toEqual([true, true]);
    expect([actsAlone({ tier: 'hands_off', decision: 'approve' }), actsAlone({ tier: 'supervised', decision: 'merge' }), actsAlone(undefined)]).toEqual([false, false, false]);
  });

  it('resolves merged-without-edit as agreed, and only edits, a person closing and reverts as catches', () => {
    const r = (outcome: Parameters<typeof resolveTrial>[0]['outcome'], edited: boolean | null = null, closedBy: 'agent' | 'person' | null = null) => resolveTrial({ outcome, edited, closedBy });
    expect([r('merged', false), r('merged', true), r('merged'), r('reverted'), r('closed', null, 'person'), r('closed', null, 'agent'), r('closed'), r('blocked'), r(null)])
      .toEqual(['agreed', 'edited', 'no_edit_fact', 'reverted', 'closed', 'closed_by_agent', 'closer_unknown', 'open', 'open']);
    const all: TrialResolution[] = ['agreed', 'edited', 'closed', 'reverted', 'open', 'no_edit_fact', 'closed_by_agent', 'closer_unknown'];
    expect(trialCount(all)).toEqual({ n: 4, catches: 3 });
  });

  it("keeps each MR's first acting-alone decision of the holder's class since from, and nothing else", () => {
    const at = (h: number) => `2026-10-0${h}T00:00:00Z`;
    const e = (o: Partial<TrialEvent> & { iid?: number }): TrialEvent => ({
      agent: 'a', action_class: 'c', kind: 'tier_decision', at: at(2), subject: { project_id: 1, type: 'mr', iid: o.iid ?? 1 },
      would: { tier: 'hands_off', decision: 'merge' }, ...o,
    });
    const events = [
      e({ at: at(1), iid: 9 }), e({ seq: 2 }), e({ seq: 3, at: at(3) }), e({ iid: 2, agent: 'b' }), e({ iid: 3, action_class: 'x' }),
      e({ iid: 4, kind: 'merged' }), e({ iid: 5, would: { tier: 'hands_off', decision: 'wait' } }), e({ iid: 6, at: 'not a time' }),
      e({ iid: 7, subject: { project_id: 1, type: 'issue', iid: 7 } }), e({ iid: 8, would: { tier: 'supervised', decision: 'approve' } }),
    ];
    const got = trialDecisions(events, { agent: 'a', classId: 'c', from: Date.parse(at(2)) });
    expect([...got.values()]).toEqual([{ iid: 1, at: Date.parse(at(2)), seq: 2, tier: 'hands_off' }, { iid: 8, at: Date.parse(at(2)), seq: null, tier: 'supervised' }]);
  });
});
