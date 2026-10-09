// parseLedgerEvent rebuilds an event field by field: a guardrail_verdict keeps the verdict the gate emitted (pass or block),
// any other kind or value is refused, and an event without one carries no verdict key at all, so it hashes as before.
import { describe, expect, it } from 'vitest';
import { append, hashEvent } from '../../src/schemas/ledger';
import { EngineError } from '../core/types';
import { parseLedgerEvent } from './ledger';

const event = (o: Record<string, unknown> = {}) => ({
  at: '2026-10-21T14:20:05Z', agent: 'ai-patcher-acme', action_class: 'code-fix.patch', kind: 'guardrail_verdict', tier_at_time: 'supervised',
  subject: { project_id: 70123456, type: 'mr', iid: 44 }, payload_ref: 'https://gitlab.example/acme/ledgerline/-/merge_requests/44', observed_by: 'ci_job', ...o,
});

describe('parseLedgerEvent: the guardrail verdict', () => {
  it('keeps pass and block on a guardrail_verdict', () => {
    expect(parseLedgerEvent(event({ verdict: 'pass' })).verdict).toBe('pass');
    expect(parseLedgerEvent(event({ verdict: 'block' })).verdict).toBe('block');
  });

  it('refuses any other value, and a verdict on any other kind', () => {
    for (const verdict of ['fail', 'PASS', null, 1, '']) expect(() => parseLedgerEvent(event({ verdict }))).toThrow(EngineError);
    expect(() => parseLedgerEvent(event({ kind: 'tier_decision', verdict: 'pass' }))).toThrow(/verdict/);
  });

  it('leaves the key absent when the event states none: the hash is the one an event without the field always had', () => {
    const parsed = parseLedgerEvent(event({ kind: 'tier_decision' }));
    expect('verdict' in parsed).toBe(false);
    const line = append([], parsed);
    expect(line.hash).toBe(hashEvent({ ...event({ kind: 'tier_decision' }), seq: 1, prev_hash: '0'.repeat(64) } as Parameters<typeof hashEvent>[0]));
  });

  it('drops every field it does not know', () => {
    expect('extra' in parseLedgerEvent(event({ verdict: 'pass', extra: 'x' }))).toBe(false);
  });
});

describe('parseLedgerEvent: the environment of a deployed event', () => {
  const deployed = (o: Record<string, unknown> = {}) => event({ kind: 'deployed', ...o });

  it('keeps a name and a tier on a deployed event', () => {
    expect(parseLedgerEvent(deployed({ environment: { name: 'production', tier: 'production', extra: 1 } })).environment).toEqual({ name: 'production', tier: 'production' });
    for (const tier of ['staging', 'testing', 'development', 'other']) expect(parseLedgerEvent(deployed({ environment: { name: 'e', tier } })).environment?.tier).toBe(tier);
  });

  it('refuses it on any other kind, and a null, an unknown tier or a nameless one', () => {
    const env = { name: 'production', tier: 'production' };
    for (const kind of ['task_started', 'proof_verdict', 'guardrail_verdict', 'tier_decision', 'merged', 'outcome', 'clock_event']) {
      expect(() => parseLedgerEvent(event({ kind, environment: env }))).toThrow(/environment/);
    }
    for (const environment of [null, 'production', { name: 'p', tier: 'prod' }, { name: '', tier: 'other' }, { tier: 'other' }]) {
      expect(() => parseLedgerEvent(deployed({ environment }))).toThrow(EngineError);
    }
  });

  it('an event without one carries no environment key and hashes as before', () => {
    const parsed = parseLedgerEvent(deployed());
    expect('environment' in parsed).toBe(false);
    expect(append([], parsed).hash).toBe(append([], { ...parsed, environment: undefined } as typeof parsed).hash);
  });
});
