import { describe, expect, it } from 'vitest';
import { append, type LedgerEvent } from '@/schemas/ledger';
import { chainLedgers } from './taskLedger';

/** One merge request's ledger, read from a fresh chainLedgers over the events. */
const taskLedger = (events: readonly LedgerEvent[], mr: string | null) => chainLedgers(events)(mr);

/** Five events: merge request !44 at seq 1, 3, 5 and !12 at seq 2, 4, appended with the schema's own hash. */
function mrChain(): LedgerEvent[] {
  const chain: LedgerEvent[] = [];
  for (const iid of [44, 12, 44, 12, 44]) {
    chain.push(
      append(chain, {
        at: `2026-10-16T09:0${chain.length}:00Z`,
        agent: 'ai-patcher-acme',
        action_class: 'dep_bump',
        kind: chain.length === 0 ? 'task_started' : 'proof_verdict',
        tier_at_time: 'supervised',
        subject: { project_id: 7, type: 'mr', iid },
        payload_ref: `proofs/mr-${iid}/${chain.length + 1}.json`,
        observed_by: 'ci_job',
      }),
    );
  }
  return chain;
}

describe('chainLedgers', () => {
  it('takes the task’s merge request slice of the chain, with the real seq, sha256 hash and prev_hash', () => {
    const chain = mrChain();
    const { ledger, ledgerCheck } = taskLedger(chain, '!44');
    expect(ledger.map((r) => r.seq)).toEqual([1, 3, 5]);
    for (const r of ledger) {
      const e = chain.find((x) => x.seq === r.seq)!;
      expect(r.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(r).toMatchObject({ hash: e.hash, prev: e.prev_hash, kind: e.kind, at: e.at, text: `${e.agent} · ${e.payload_ref}` });
    }
    expect(ledgerCheck).toEqual({ hash: 'sha256', brokenAt: null });
  });

  it('holds no rows for a task with no merge request, or one the chain never names', () => {
    expect(taskLedger(mrChain(), null).ledger).toEqual([]);
    expect(taskLedger(mrChain(), '!41').ledger).toEqual([]);
  });

  it('does not take an event about an issue with the same iid', () => {
    const chain = mrChain();
    const issue = append(chain, { ...chain[0]!, subject: { project_id: 7, type: 'issue', iid: 44 } } as Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>);
    expect(taskLedger([...chain, issue], '!44').ledger.map((r) => r.seq)).toEqual([1, 3, 5]);
  });

  it('serves every merge request of the docket from one reading, each its own slice', () => {
    const ledgerFor = chainLedgers(mrChain());
    expect([ledgerFor('!44'), ledgerFor('!12'), ledgerFor(null)].map((l) => l.ledger.map((r) => r.seq))).toEqual([[1, 3, 5], [2, 4], []]);
  });

  it('states the first broken link of the whole chain, verified once', () => {
    const chain = mrChain();
    chain[2] = { ...chain[2]!, payload_ref: 'proofs/forged.json' };
    expect(taskLedger(chain, '!44').ledgerCheck).toEqual({ hash: 'sha256', brokenAt: 3 });
    expect(taskLedger(chain, '!12').ledgerCheck.brokenAt).toBe(3);
  });
});
