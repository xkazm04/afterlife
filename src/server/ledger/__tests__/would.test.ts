// What the next rung would have decided (would), on a tier_decision: kept and checked by the parser, stored and read back
// by the index, and covered by the hash. An event without it carries no key, so every chain written before it (the fake's,
// and verdict.test.ts's pinned hashes) still verifies.
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
const REV = 'c1'.repeat(20);

/** The fake's chain with two decisions after it: one at supervised that would merge at hands_off, one at hands_off (no rung above). */
function withWould(): LedgerEvent[] {
  const chain = ledgerEvents(SEED_NOW);
  const last = body(chain.at(-1)!);
  const a = append(chain, { ...last, subject: { ...last.subject, iid: 45 }, tier_at_time: 'supervised', state_rev: REV, would: { tier: 'hands_off', decision: 'merge' } });
  const b = append([...chain, a], { ...last, subject: { ...last.subject, iid: 46 }, tier_at_time: 'hands_off' });
  return [...chain, a, b];
}

describe('would on a tier_decision', () => {
  it('every existing fixture chain still verifies and carries no would', () => {
    const chain = ledgerEvents(SEED_NOW);
    expect(verifyChain(chain)).toBeNull();
    expect(chain.some((e) => 'would' in e)).toBe(false);
    expect(verifyChain(parseLedgerJsonl(jsonl(chain)))).toBeNull();
  });

  it('an explicit undefined hashes as absent', () => {
    const [first] = ledgerEvents(SEED_NOW);
    expect(append([], { ...body(first!), would: undefined } as Body).hash).toBe(append([], body(first!)).hash);
  });

  it('a chain carrying it verifies after parse, append and read', async () => {
    const chain = withWould();
    expect(verifyChain(chain)).toBeNull();
    const parsed = parseLedgerJsonl(jsonl(chain));
    expect(parsed).toEqual(chain);
    const db = await memoryIndex();
    await appendLedgerEvents(db, parsed);
    const read = await readLedger(db, chain[0]!.subject.project_id);
    expect(read).toEqual(chain);
    expect(read.slice(-2).map((e) => e.would)).toEqual([{ tier: 'hands_off', decision: 'merge' }, undefined]);
    expect('would' in read.at(-1)!).toBe(false);
    expect(verifyChain(read)).toBeNull();
  });

  it('the hash covers it: another decision, or a would added, no longer verifies', () => {
    const chain = withWould();
    const seq = chain.at(-2)!.seq;
    expect(verifyChain(chain.map((e) => (e.seq === seq ? { ...e, would: { tier: 'hands_off' as const, decision: 'wait' as const } } : e)))).toBe(seq);
    expect(verifyChain(chain.map((e) => (e.seq === seq + 1 ? { ...e, would: { tier: 'supervised' as const, decision: 'approve' as const } } : e)))).toBe(seq + 1);
  });

  it('the parser refuses it on any other kind, and a malformed value', () => {
    const chain = withWould();
    const merged = ledgerEvents(SEED_NOW)[3]!;
    const decision = chain.at(-2)!; // supervised: the rung above is hands_off
    const bad = [
      { ...merged, would: { tier: 'hands_off', decision: 'merge' } },
      { ...decision, would: { tier: 'supervised', decision: 'merge' } }, // not the rung above
      { ...decision, would: { tier: 'hands_off', decision: 'ship' } },
      { ...decision, would: { tier: 'hands_off', decision: 'merge', note: 'x' } },
      { ...decision, would: null }, { ...decision, would: 'merge' }, { ...chain.at(-1)!, would: { tier: 'hands_off', decision: 'merge' } },
    ];
    for (const e of bad) {
      expect(() => parseLedgerJsonl(JSON.stringify(e))).toThrow(LedgerParseError);
      expect(() => parseLedgerJsonl(JSON.stringify(e))).toThrow(/would/);
    }
  });

  it('the index refuses it on any other kind too', async () => {
    const chain = ledgerEvents(SEED_NOW);
    const forged = append(chain.slice(0, 3), { ...body(chain[3]!), would: { tier: 'hands_off', decision: 'merge' } });
    const db = await memoryIndex();
    await expect(appendLedgerEvents(db, [...chain.slice(0, 3), forged])).rejects.toThrow();
  });
});
