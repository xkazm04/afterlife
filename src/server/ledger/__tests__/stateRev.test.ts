// The tier-state.yml revision a gate read (state_rev) and what the sweep withdrew (withdrew), on a tier_decision: kept and
// checked by the parser, stored and read back by the index, and covered by the hash. An event without them carries no
// key, so every chain written before them (the fake's, and verdict.test.ts's pinned hashes) still verifies.
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

/** The fake's chain with two decisions after it: one that read REV and withdrew an approval, one that read it only. */
function withDecisions(): LedgerEvent[] {
  const chain = ledgerEvents(SEED_NOW);
  const last = body(chain.at(-1)!);
  const a = append(chain, { ...last, subject: { ...last.subject, iid: 45 }, tier_at_time: 'supervised', state_rev: REV, withdrew: ['approval'] });
  const b = append([...chain, a], { ...last, subject: { ...last.subject, iid: 46 }, state_rev: REV });
  return [...chain, a, b];
}

describe('state_rev and withdrew on a tier_decision', () => {
  it('every existing fixture chain still verifies and carries neither key', () => {
    const chain = ledgerEvents(SEED_NOW);
    expect(verifyChain(chain)).toBeNull();
    expect(chain.some((e) => 'state_rev' in e || 'withdrew' in e)).toBe(false);
    expect(verifyChain(parseLedgerJsonl(jsonl(chain)))).toBeNull();
  });

  it('an explicit undefined hashes as absent', () => {
    const [first] = ledgerEvents(SEED_NOW);
    expect(append([], { ...body(first!), state_rev: undefined, withdrew: undefined } as Body).hash).toBe(append([], body(first!)).hash);
  });

  it('a chain carrying them verifies after parse, append and read', async () => {
    const chain = withDecisions();
    expect(verifyChain(chain)).toBeNull();
    const parsed = parseLedgerJsonl(jsonl(chain));
    expect(parsed).toEqual(chain);
    const db = await memoryIndex();
    await appendLedgerEvents(db, parsed);
    const read = await readLedger(db, chain[0]!.subject.project_id);
    expect(read).toEqual(chain);
    expect(read.slice(-2).map((e) => [e.state_rev, e.withdrew])).toEqual([[REV, ['approval']], [REV, undefined]]);
    expect(read.slice(-1).map((e) => 'withdrew' in e)).toEqual([false]);
    expect(verifyChain(read)).toBeNull();
  });

  it('the hash covers them: another revision, or a withdrawal added, no longer verifies', () => {
    const chain = withDecisions();
    const seq = chain.at(-2)!.seq;
    expect(verifyChain(chain.map((e) => (e.seq === seq ? { ...e, state_rev: 'd'.repeat(40) } : e)))).toBe(seq);
    expect(verifyChain(chain.map((e) => (e.seq === seq + 1 ? { ...e, withdrew: ['auto_merge' as const] } : e)))).toBe(seq + 1);
  });

  it('the parser refuses them on any other kind, and a malformed value', () => {
    const chain = withDecisions();
    const merged = ledgerEvents(SEED_NOW)[3]!;
    const decision = chain.at(-1)!;
    const bad = [
      { ...merged, state_rev: REV }, { ...merged, withdrew: ['approval'] },
      { ...decision, state_rev: 'c1' }, { ...decision, state_rev: REV.toUpperCase() }, { ...decision, state_rev: null },
      { ...decision, withdrew: [] }, { ...decision, withdrew: ['approval', 'approval'] }, { ...decision, withdrew: ['merge'] }, { ...decision, withdrew: 'approval' },
    ];
    for (const e of bad) {
      expect(() => parseLedgerJsonl(JSON.stringify(e))).toThrow(LedgerParseError);
      expect(() => parseLedgerJsonl(JSON.stringify(e))).toThrow(/state_rev|withdrew/);
    }
  });

  it('the index refuses them on any other kind too', async () => {
    const chain = ledgerEvents(SEED_NOW);
    const forged = append(chain.slice(0, 3), { ...body(chain[3]!), state_rev: REV });
    const db = await memoryIndex();
    await expect(appendLedgerEvents(db, [...chain.slice(0, 3), forged])).rejects.toThrow();
  });
});
