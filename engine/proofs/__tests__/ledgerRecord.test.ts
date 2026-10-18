import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { append, type LedgerEvent } from '../../../src/schemas/ledger';
import { checkOf, fixture, fx, NOW, policy } from '../../__tests__/helpers';
import { checksFor } from '../checkers/evidence';
import { trialCheck, trialFromChain } from '../checkers/ledgerRecord';
import { prove } from '../index';

const env = { policy: policy(), now: NOW };
const input = fixture('ledger', 'input.json');
const CHAIN = fs.readFileSync(fx('ledger', 'chain.jsonl'), 'utf8');
const events = (): LedgerEvent[] => CHAIN.trim().split('\n').map((l) => JSON.parse(l) as LedgerEvent);
const jsonl = (es: readonly LedgerEvent[]): string => es.map((e) => JSON.stringify(e)).join('\n') + '\n';
const run = (patch: Record<string, unknown> = {}) => prove('ledger-record', { ...input, ...patch }, env);
const H = { agent: 'ai-qa-acme-lab', classId: 'qa.file-bug', from: Date.parse('2026-09-20T08:00:00Z') };

describe('ledger-record', () => {
  it('passes a chain that verifies, with the trial recomputed from it alone', () => {
    const b = run();
    expect(b.verdict).toBe('pass');
    expect(checkOf(b, 'chain-verifies').detail).toBe(`11 event(s) verify from genesis; head seq 11 ${events().at(-1)!.hash}`);
    expect(checkOf(b, 'trial-recomputed')).toMatchObject({
      ok: true, claim_id: 't1',
      detail: 'next-rung trial 0 resolved, 0 caught; 3 trial MR(s) (tier_decision seq 3-7), 3 unresolved: the chain states no edit fact, close or revert',
    });
  });

  it('the trial MRs are exactly the decisions whose would acts alone, of the holder, since the record; one per MR', () => {
    const t = trialFromChain(events(), H);
    expect(t.mrs).toEqual([{ iid: 201, seq: 3, resolution: 'no_edit_fact' }, { iid: 202, seq: 5, resolution: 'no_edit_fact' }, { iid: 203, seq: 7, resolution: 'open' }]);
    expect([t.n, t.catches]).toEqual([0, 0]);
  });

  it('with thresholds, a row short of min is inconclusive, never a pass; a catch over the bound fails; a met row passes', () => {
    const short = prove('ledger-record', fixture('ledger', 'input.trial.json'), env);
    expect(short.verdict).toBe('inconclusive');
    expect(checkOf(short, 'trial-recomputed').detail).toMatch(/^next-rung trial 0 of 15, 0 caught; .*; short of 15 resolved$/);
    const at = checksFor({});
    const row = (n: number, catches: number) => trialCheck(at, { n, catches, mrs: [] }, { min: 15, catches: 0 });
    expect([row(15, 0).ok, row(20, 1).ok, row(14, 0).ok]).toEqual([true, false, null]);
    expect(row(20, 1).detail).toMatch(/more than 0 caught$/);
  });

  it('flipping one event\'s hash, or its content, names that seq and fails the proof', () => {
    const es = events();
    const flipped = es.map((e) => (e.seq === 5 ? { ...e, hash: `${e.hash[0] === 'a' ? 'b' : 'a'}${e.hash.slice(1)}` } : e));
    const b = run({ chain: jsonl(flipped) });
    expect(b.verdict).toBe('fail');
    expect(checkOf(b, 'chain-verifies').detail).toMatch(/^the chain breaks at seq 5:/);
    expect(checkOf(b, 'trial-recomputed')).toMatchObject({ ok: null, detail: 'a chain that does not verify states nothing' });
    const edited = es.map((e) => (e.seq === 7 ? { ...e, would: { tier: 'hands_off' as const, decision: 'wait' as const } } : e));
    expect(checkOf(run({ chain: jsonl(edited) }), 'chain-verifies').detail).toMatch(/^the chain breaks at seq 7:/);
  });

  it('never passes on missing or unreadable input: no chain, a line that is not JSON, no record, bad thresholds', () => {
    expect(run({ chain: undefined }).verdict).toBe('inconclusive');
    expect(checkOf(run({ chain: `${CHAIN}{ nope\n` }), 'chain-verifies')).toMatchObject({ ok: false, detail: 'chain line 12: not valid JSON' });
    expect(checkOf(run({ record: { agent: 'ai-qa-acme-lab', class: 'qa.file-bug' } }), 'trial-recomputed').ok).toBeNull();
    for (const trial of [{ min: 0, catches: 0 }, { min: 15 }, 'all']) expect(run({ trial }).verdict).toBe('inconclusive');
  });

  it('a would the importer refuses (not the rung above), hashed into a chain, fails the chain as the importer does; it is no trial', () => {
    const es = events();
    const body = { ...es[2]!, subject: { ...es[2]!.subject, iid: 250 }, tier_at_time: 'assisted' as const };
    const { seq: _s, prev_hash: _p, hash: _h, ...rest } = body;
    void [_s, _p, _h];
    const forged = [...es, append(es, rest)];
    expect(checkOf(run({ chain: jsonl(forged) }), 'chain-verifies')).toMatchObject({ ok: false, detail: expect.stringMatching(/^chain line 12: would/) });
    expect(trialFromChain(forged, H).mrs.map((m) => m.iid)).toEqual([201, 202, 203]);
  });

  it('a hash-valid chain whose line 2 is no ledger event (kind bogus) does not verify, and names line 2', () => {
    const [one, two] = events();
    const { seq: _s, prev_hash: _p, hash: _h, ...rest } = two!;
    void [_s, _p, _h];
    const b = run({ chain: jsonl([one!, append([one!], { ...rest, kind: 'bogus' as LedgerEvent['kind'] })]) });
    expect(checkOf(b, 'chain-verifies')).toMatchObject({ ok: false, detail: expect.stringMatching(/^chain line 2: /) });
    expect(checkOf(b, 'trial-recomputed').ok).toBeNull();
    expect(b.verdict).toBe('fail');
  });
});
