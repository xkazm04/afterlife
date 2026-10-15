import { describe, expect, it } from 'vitest';
import { verdictOf, type Check, type ProofBlock } from '../../src/schemas/proof';
import type { Tier, TierRecord, TierState } from '../../src/schemas/tier';
// The next rung's shadow decision (./shadow.ts). The CLI's --shadow-next-rung is pinned in engine/cli.test.ts.
import { NOW, policy } from '../__tests__/helpers';
import { gate, type GateInput } from './gate';
import { shadowNextRung } from './shadow';

const P = policy();
const AGENT = 'ai-patcher-acme';

function proof(ok: boolean | null): ProofBlock {
  const checks: Check[] = [{ claim_id: null, name: 'c', ok, detail: '' }];
  return {
    schema: 'belay.proof/1', id: 'X', class: 'exploit-test', task: { flow: 'patcher', run_id: 'r', project_id: 1, trailer: 't' },
    claims: [], checks, evidence: [], verdict: verdictOf(checks, true), envelope: { files: 1, lines: 2, paths_touched: ['a.kt'], within: true },
    engine: { version: '1.0.0', sha256: 'abc' },
  };
}

const state = (tier: Tier, extra: Partial<TierRecord> = {}): TierState => ({
  version: 1, policy_sha: 'x', agents: { [AGENT]: { 'dep-bump.patch': { tier, since: '2026-10-09', by: 'test', ...extra }, 'code-fix.patch': { tier, since: '2026-10-09', by: 'test' } } },
});
const input = (tier: Tier, over: Partial<GateInput> = {}): GateInput => ({
  policy: P, state: state(tier), classId: 'dep-bump.patch', agent: AGENT, proof: proof(true), guardrail: { verdict: 'pass' }, now: NOW, ...over,
});

describe('shadowNextRung: the same gate, the holder one rung up', () => {
  it('a supervised record would merge at hands_off where the gate approves', () => {
    const g = input('supervised');
    expect(gate(g).decision).toBe('approve');
    expect(shadowNextRung(g)).toEqual({ tier: 'hands_off', decision: 'merge' });
  });

  it('an assisted record would approve at supervised; a quarantined one would wait at assisted', () => {
    expect(shadowNextRung(input('assisted'))).toEqual({ tier: 'supervised', decision: 'approve' });
    expect(shadowNextRung(input('quarantined'))).toEqual({ tier: 'assisted', decision: 'wait' });
  });

  it('reads the same proof, guardrail and envelope: a failed proof or a guardrail block blocks there too', () => {
    expect(shadowNextRung(input('supervised', { proof: proof(false) }))).toEqual({ tier: 'hands_off', decision: 'block' });
    expect(shadowNextRung(input('supervised', { guardrail: { verdict: 'block' } }))).toEqual({ tier: 'hands_off', decision: 'block' });
    expect(shadowNextRung(input('supervised', { proof: undefined }))).toEqual({ tier: 'hands_off', decision: 'wait' });
  });

  it('no next rung: the top rung, the class ceiling, no record, an unknown class', () => {
    expect(shadowNextRung(input('hands_off'))).toBeNull();
    expect(shadowNextRung(input('supervised', { classId: 'code-fix.patch' }))).toBeNull(); // ceiling supervised
    expect(shadowNextRung(input('supervised', { agent: 'ai-someone-else' }))).toBeNull();
    expect(shadowNextRung(input('supervised', { classId: 'nope' }))).toBeNull();
  });

  it('a stale lease on the record does not lapse the raised one, and the input state is not touched', () => {
    const g = input('supervised', { state: state('supervised', { lease_expires: '2020-01-01T00:00:00Z' }) });
    const before = JSON.stringify(g.state);
    expect(shadowNextRung(g)).toEqual({ tier: 'hands_off', decision: 'merge' });
    expect(JSON.stringify(g.state)).toBe(before);
  });
});
