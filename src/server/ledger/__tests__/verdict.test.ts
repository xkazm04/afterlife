// The guardrail's verdict on a guardrail_verdict event: kept and checked by the parser, stored and read back by the index,
// and covered by the hash. An event without one carries no verdict key, so every chain written before it still verifies.
import { describe, expect, it } from 'vitest';
import { append, verifyChain, type LedgerEvent } from '@/schemas/ledger';
import { ledgerEvents } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { appendLedgerEvents, readLedger } from '@/server/index/repositories/ledger/ledger';
import { SEED_NOW } from '@/server/index/seed/parse';
import { LedgerParseError, parseLedgerJsonl } from '../parse';

type Body = Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>;
const body = ({ seq: _s, prev_hash: _p, hash: _h, ...rest }: LedgerEvent): Body => (void [_s, _p, _h], rest);
const jsonl = (events: readonly LedgerEvent[]): string => events.map((e) => JSON.stringify(e)).join('\n') + '\n';
const rechain = (bodies: readonly Body[]): LedgerEvent[] => bodies.reduce<LedgerEvent[]>((c, b) => [...c, append(c, b)], []);
/** The fake's chain as it was before events stated a verdict: the same events, no verdict key. */
const before = (): LedgerEvent[] => rechain(ledgerEvents(SEED_NOW).map(body).map(({ verdict: _v, ...b }) => (void _v, b)));

describe('the guardrail verdict on the ledger', () => {
  it('an event without one hashes exactly as it did before the field existed', () => {
    // the hashes main computed for the fake's chain at SEED_NOW, before LedgerEvent had a verdict
    expect(before().map((e) => e.hash.slice(0, 16))).toEqual([
      '93743754f3f3a9fe', 'cdea77158702a062', 'f2b6ae79d8bac6a6', '3f89b75fd175b5f1', 'f91525b536cb9e02', '06fd7897d9c5bec8', 'ccdbae6efa2fc0c3',
    ]);
    expect(before().some((e) => 'verdict' in e)).toBe(false);
  });

  it('the fake states the verdict its merge request states: !41 pass, !44 block', () => {
    const verdicts = ledgerEvents(SEED_NOW).filter((e) => e.kind === 'guardrail_verdict').map((e) => [e.subject.iid, e.verdict]);
    expect(verdicts).toEqual([[41, 'pass'], [44, 'block']]);
    expect(ledgerEvents(SEED_NOW).filter((e) => e.kind !== 'guardrail_verdict').some((e) => 'verdict' in e)).toBe(false);
  });

  it('a chain, with and without verdicts, verifies after parse, appendLedgerEvents and readLedger', async () => {
    for (const [project, chain] of [[1, before()], [2, ledgerEvents(SEED_NOW)]] as const) {
      const moved = chain.map((e) => ({ ...e, subject: { ...e.subject, project_id: project } }));
      const events = rechain(moved.map(body));
      const parsed = parseLedgerJsonl(jsonl(events));
      expect(parsed).toEqual(events);
      expect(verifyChain(parsed)).toBeNull();
      const db = await memoryIndex();
      await appendLedgerEvents(db, parsed);
      const read = await readLedger(db, project);
      expect(read).toEqual(events);
      expect(verifyChain(read)).toBeNull();
      expect(read.map((e) => 'verdict' in e)).toEqual(events.map((e) => 'verdict' in e));
    }
  });

  it('the hash covers it: a pass edited to a block no longer verifies', () => {
    const chain = ledgerEvents(SEED_NOW);
    const edited = chain.map((e) => (e.verdict === 'pass' ? { ...e, verdict: 'block' as const } : e));
    expect(verifyChain(edited)).toBe(3);
  });

  it('the parser refuses a verdict on another kind, any other value, and a null', () => {
    const [first, , third] = ledgerEvents(SEED_NOW);
    for (const bad of [{ ...first!, verdict: 'pass' }, { ...third!, verdict: 'fail' }, { ...third!, verdict: null }]) {
      expect(() => parseLedgerJsonl(JSON.stringify(bad))).toThrow(LedgerParseError);
      expect(() => parseLedgerJsonl(JSON.stringify(bad))).toThrow(/verdict/);
    }
  });
});
