// `ledger append --write` reads, verifies and appends under `<chain>.lock`: two appends racing on one chain give one
// line and one named refusal, never two lines with the same seq (a fork the chain no longer verifies past).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { verifyChain } from '../../src/schemas/ledger';
import { main } from '../cli';
import { readChain, withChainLock } from '../commands/ledger';
import { capture } from './helpers';

const event = {
  at: '2026-10-21T14:20:05Z', agent: 'ai-patcher-acme', action_class: 'code-fix.patch', kind: 'guardrail_verdict', tier_at_time: 'supervised',
  subject: { project_id: 70123456, type: 'mr', iid: 44 }, payload_ref: 'https://gitlab.example/acme/ledgerline/-/merge_requests/44', observed_by: 'ci_job', verdict: 'pass',
};

describe('ledger append --write under a concurrent writer', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-lock-'));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  const ev = path.join(tmp, 'event.json');
  fs.writeFileSync(ev, JSON.stringify(event));
  const run = (chain: string) => {
    const c = capture(tmp);
    const code = main(['ledger', 'append', '--event', ev, '--chain', chain, '--write'], c.io);
    return { code, json: c.json() as Record<string, unknown> };
  };

  it('refuses the append that loses the race by name, leaves the chain as the winner wrote it, and frees the lock', () => {
    const chain = path.join(tmp, 'race.jsonl');
    let loser: ReturnType<typeof run> | undefined;
    // the winner holds the lock across its read-verify-append; the second job arrives in the middle of it
    const winner = withChainLock(chain, () => {
      loser = run(chain);
      return 'held';
    });
    expect(winner).toBe('held');
    expect([loser?.code, loser?.json.error]).toEqual([2, expect.stringMatching(/^the chain is locked by another writer \(.*race\.jsonl\.lock\); it is not extended/)]);
    expect(fs.existsSync(chain)).toBe(false);
    expect(run(chain).code).toBe(0);
    expect(run(chain).code).toBe(0);
    const lines = readChain(fs.readFileSync(chain, 'utf8'));
    expect([lines.map((l) => l.seq), verifyChain(lines)]).toEqual([[1, 2], null]);
    expect(fs.existsSync(`${chain}.lock`)).toBe(false);
  });

  it('frees the lock when the append itself is refused (a broken chain)', () => {
    const chain = path.join(tmp, 'broken.jsonl');
    fs.writeFileSync(chain, '{"seq": 1}\n');
    expect(run(chain).code).toBe(2);
    expect(fs.existsSync(`${chain}.lock`)).toBe(false);
  });
});
