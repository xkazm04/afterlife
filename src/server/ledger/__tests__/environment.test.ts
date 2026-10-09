// The environment a deployed event deployed to: kept and checked by the parser, stored and read back by the index, and
// covered by the hash. An event without one carries no environment key, so every chain written before it still verifies.
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
const without = (): LedgerEvent[] => rechain(ledgerEvents(SEED_NOW).map(body).map(({ environment: _e, ...b }) => (void _e, b)));

describe('the environment on a deployed event', () => {
  it('an event without one hashes exactly as it did before the field existed', () => {
    // verdict.test.ts pins the fake's whole chain without either key against main's hashes; here the key itself
    const [first] = ledgerEvents(SEED_NOW);
    expect(append([], { ...body(first!), environment: undefined } as Body).hash).toBe(append([], body(first!)).hash);
    expect(without().some((e) => 'environment' in e)).toBe(false);
    expect(verifyChain(without())).toBeNull();
  });

  it('the fake states !41\'s deployment as production, and no other event states one', () => {
    const states = ledgerEvents(SEED_NOW).filter((e) => 'environment' in e);
    expect(states.map((e) => [e.subject.iid, e.kind, e.environment])).toEqual([[41, 'deployed', { name: 'production', tier: 'production' }]]);
    expect(ledgerEvents(SEED_NOW)).toHaveLength(7);
  });

  it('the parser keeps it, and the chain verifies after parse, append and read', async () => {
    const chain = ledgerEvents(SEED_NOW);
    const parsed = parseLedgerJsonl(jsonl(chain));
    expect(parsed).toEqual(chain);
    expect(verifyChain(parsed)).toBeNull();
    const db = await memoryIndex();
    await appendLedgerEvents(db, parsed);
    const read = await readLedger(db, chain[0]!.subject.project_id);
    expect(read).toEqual(chain);
    expect(read.map((e) => 'environment' in e)).toEqual(chain.map((e) => 'environment' in e));
    expect(verifyChain(read)).toBeNull();
  });

  it('the hash covers it: a production edited to staging no longer verifies', () => {
    const edited = ledgerEvents(SEED_NOW).map((e) => (e.environment ? { ...e, environment: { name: 'production', tier: 'staging' as const } } : e));
    expect(verifyChain(edited)).toBe(5);
  });

  it('the parser refuses it on any other kind, a null, an unknown tier and a nameless one', () => {
    const chain = ledgerEvents(SEED_NOW);
    const deployed = chain[4]!;
    const prod = { name: 'production', tier: 'production' };
    for (const bad of [{ ...chain[0]!, environment: prod }, { ...deployed, environment: null }, { ...deployed, environment: { name: 'p', tier: 'prod' } }, { ...deployed, environment: { name: '', tier: 'other' } }]) {
      expect(() => parseLedgerJsonl(JSON.stringify(bad))).toThrow(LedgerParseError);
      expect(() => parseLedgerJsonl(JSON.stringify(bad))).toThrow(/environment/);
    }
  });
});
