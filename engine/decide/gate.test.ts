import { describe, expect, it } from 'vitest';
import { verdictOf, type Check, type ProofBlock, type ProofClass } from '../../src/schemas/proof';
import type { Tier, TierRecord, TierState } from '../../src/schemas/tier';
import { NOW, policy } from '../__tests__/helpers';
import { checkEnvelope } from '../policy/envelope';
import { gate, type GateInput, type GuardrailVerdict } from './gate';

const P = policy();
const AGENT = 'ai-patcher-acme';

function proof(cls: ProofClass, ok: boolean | null, over: Partial<ProofBlock> = {}): ProofBlock {
  const checks: Check[] = [{ claim_id: null, name: 'c', ok, detail: '' }];
  const envelope = { files: 1, lines: 2, paths_touched: ['a.kt'], within: true, ...over.envelope };
  return {
    schema: 'belay.proof/1', id: 'X', class: cls, task: { flow: 'patcher', run_id: 'r', project_id: 1, trailer: 't' },
    claims: [], checks, evidence: [], verdict: verdictOf(checks, envelope.within), envelope, engine: { version: '1.0.0', sha256: 'abc' }, ...over,
  };
}

const rec = (tier: Tier, extra: Partial<TierRecord> = {}): TierRecord => ({ tier, since: '2026-10-09', by: 'test', ...extra });
const state = (tier: Tier, extra: Partial<TierRecord> = {}, agents: string[] = [AGENT]): TierState => ({
  version: 1, policy_sha: 'x', agents: Object.fromEntries(agents.map((a) => [a, { 'dep-bump.patch': rec(tier, extra), 'code-fix.patch': rec(tier, extra), 'guard.block': rec(tier) }])),
});
const PASS: GuardrailVerdict = { verdict: 'pass' };

function decide(over: Partial<GateInput> & { tier?: Tier }) {
  const { tier = 'hands_off', ...rest } = over;
  return gate({ policy: P, state: state(tier), classId: 'dep-bump.patch', proof: proof('exploit-test', true), guardrail: PASS, now: NOW, ...rest });
}

describe('gate matrix: tier x proof x guardrail', () => {
  it.each<[string, Tier, ProofBlock | undefined, GuardrailVerdict | undefined, string]>([
    ['hands_off, pass, pass', 'hands_off', proof('exploit-test', true), PASS, 'merge'],
    ['supervised, pass, pass', 'supervised', proof('exploit-test', true), PASS, 'approve'],
    ['assisted, pass, pass', 'assisted', proof('exploit-test', true), PASS, 'wait'],
    ['quarantined, pass, pass', 'quarantined', proof('exploit-test', true), PASS, 'block'],
    ['hands_off, proof fails', 'hands_off', proof('exploit-test', false), PASS, 'block'],
    ['supervised, proof fails', 'supervised', proof('exploit-test', false), PASS, 'block'],
    ['hands_off, proof inconclusive', 'hands_off', proof('exploit-test', null), PASS, 'wait'],
    ['hands_off, no proof yet', 'hands_off', undefined, PASS, 'wait'],
    ['hands_off, guardrail blocks', 'hands_off', proof('exploit-test', true), { verdict: 'block' }, 'block'],
    ['supervised, guardrail blocks', 'supervised', proof('exploit-test', true), { verdict: 'block', severity: 'high' }, 'block'],
    ['hands_off, no guardrail yet', 'hands_off', proof('exploit-test', true), undefined, 'wait'],
    ['hands_off, guardrail says something else', 'hands_off', proof('exploit-test', true), { verdict: 'maybe' }, 'wait'],
    ['hands_off, proof fails and guardrail missing', 'hands_off', proof('exploit-test', false), undefined, 'block'],
    ['quarantined, nothing yet', 'quarantined', undefined, undefined, 'block'],
  ])('%s -> %s', (_name, tier, p, g, expected) => {
    expect(decide({ tier, proof: p, guardrail: g }).decision).toBe(expected);
  });
});

describe('gate: what hands-off merging needs', () => {
  it('merges only with proof pass, guardrail pass and the envelope all holding', () => {
    const r = decide({});
    expect(r).toMatchObject({ decision: 'merge', tier: 'hands_off', agent: AGENT });
    expect(r.reasons.join(' ')).toMatch(/inside the envelope/);
  });

  it('blocks when the proof itself reports the change outside the envelope', () => {
    const p = proof('exploit-test', true, { envelope: { files: 9, lines: 400, paths_touched: [], within: false } });
    const r = decide({ proof: p });
    expect(r.decision).toBe('block');
    expect(r.reasons.join(' ')).toMatch(/outside the envelope/);
  });

  it('blocks on an envelope the gate measured itself from the diff (denied path)', () => {
    const diff = 'diff --git a/CODEOWNERS b/CODEOWNERS\n--- a/CODEOWNERS\n+++ b/CODEOWNERS\n@@ -1 +1 @@\n-a\n+b\n';
    const r = decide({ envelope: checkEnvelope(P, 'dep-bump.patch', diff) });
    expect(r.decision).toBe('block');
    expect(r.reasons.join(' ')).toMatch(/denied path/);
    expect(decide({ envelope: checkEnvelope(P, 'dep-bump.patch', diff.replace(/CODEOWNERS/g, 'package.json')) }).decision).toBe('merge');
  });

  it('blocks production for a class without a mechanical proof, through the envelope result', () => {
    const d = 'diff --git a/a.kt b/a.kt\n--- a/a.kt\n+++ b/a.kt\n@@ -1 +1 @@\n-a\n+b\n';
    const r = decide({ classId: 'guard.block', proof: proof('cited-diff', true), envelope: checkEnvelope(P, 'guard.block', d, ['production']) });
    expect(r.decision).toBe('block');
    expect(decide({ envelope: checkEnvelope(P, 'dep-bump.patch', d.replace(/a.kt/g, 'package.json'), ['production']) }).decision).toBe('merge');
  });
});

describe('gate: tampering and fail-closed behaviour', () => {
  it('blocks a proof whose verdict does not follow from its checks', () => {
    const forged = proof('exploit-test', false, { verdict: 'pass' });
    const r = decide({ proof: forged });
    expect(r.decision).toBe('block');
    expect(r.reasons.join(' ')).toMatch(/says pass but its checks give fail/);
  });

  it('blocks a proof of the wrong class for the action class', () => {
    const r = decide({ proof: proof('cited-diff', true) });
    expect(r.decision).toBe('block');
    expect(r.reasons.join(' ')).toMatch(/needs a exploit-test proof, got cited-diff/);
  });

  it('blocks a proof made by another engine build, when the gate pins one', () => {
    expect(decide({ engineSha: 'abc' }).decision).toBe('merge');
    expect(decide({ engineSha: 'zzz' }).decision).toBe('block');
  });

  it('blocks an unknown class, a human-only class, and an agent the ladder does not list', () => {
    expect(decide({ classId: 'made.up' }).decision).toBe('block');
    const human = decide({ classId: 'report.submit' });
    expect(human.decision).toBe('block');
    expect(human.reasons[0]).toMatch(/human_only/);
    expect(decide({ agent: 'ai-stranger' }).decision).toBe('block');
    expect(decide({ state: { version: 1, policy_sha: 'x', agents: {} } }).decision).toBe('block');
  });

  it('refuses to guess between several agents holding the class', () => {
    const two = state('hands_off', {}, [AGENT, 'ai-patcher-beta']);
    expect(decide({ state: two }).decision).toBe('block');
    expect(decide({ state: two, agent: 'ai-patcher-beta' }).decision).toBe('merge');
  });

  it('uses the lower of the recorded tier and the class ceiling', () => {
    const r = decide({ classId: 'code-fix.patch' }); // recorded hands_off, ceiling supervised
    expect(r).toMatchObject({ decision: 'approve', tier: 'supervised', state_tier: 'hands_off' });
    expect(r.reasons[0]).toMatch(/ceiling supervised/);
  });

  it('treats a lapsed hands-off lease as supervised', () => {
    const lapsed = state('hands_off', { lease_expires: '2026-10-20T00:00:00Z' });
    expect(decide({ state: lapsed })).toMatchObject({ decision: 'approve', tier: 'supervised' });
    const live = state('hands_off', { lease_expires: '2026-11-20T00:00:00Z' });
    expect(decide({ state: live }).decision).toBe('merge');
  });

  it('keeps blocking reasons from every failing source', () => {
    const r = decide({ tier: 'quarantined', proof: proof('exploit-test', false), guardrail: { verdict: 'block', severity: 'high' } });
    expect(r.reasons.join('|')).toMatch(/quarantined.*guardrail blocked \(high\).*proof failed/);
  });
});
