// The chain is verified once per poll by the live source (getLedgerCheck), never per /task request: loadTasks and
// firstTaskId take the source's brokenAt and call verifyChain zero times. verifyChain is wrapped to count its calls.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTasks, type Task } from '@/lib/demo';
import * as ledger from '@/schemas/ledger';
import { append, type LedgerEvent } from '@/schemas/ledger';
import { demoSource } from '@/server/data/demoSource';
import { setDataSource } from '@/server/data/select';
import type { DataSource } from '@/server/data/types';
import { replayMessage } from '../../verdict/replay';
import { firstTaskId, loadTasks } from '../loadTasks';

vi.mock('@/schemas/ledger', async (original) => {
  const m = await original<typeof import('@/schemas/ledger')>();
  return { ...m, verifyChain: vi.fn(m.verifyChain) };
});
const verifyCalls = () => vi.mocked(ledger.verifyChain).mock.calls.length;
afterEach(() => {
  setDataSource(null);
  vi.mocked(ledger.verifyChain).mockClear();
});

/** Three events about merge request !44, appended with the schema's own hash: an intact chain. */
function chain(): LedgerEvent[] {
  const out: LedgerEvent[] = [];
  for (let n = 1; n <= 3; n++) {
    const body = { at: `2026-10-16T09:0${n}:00Z`, agent: 'ai-patcher-acme', action_class: 'dep_bump', kind: 'proof_verdict', tier_at_time: 'supervised' } as const;
    out.push(append(out, { ...body, subject: { project_id: 7, type: 'mr', iid: 44 }, payload_ref: `proofs/${n}.json`, observed_by: 'ci_job' }));
  }
  return out;
}
const task: Task = { ...getTasks().find((t) => t.id === '01J8Q4')!, id: '01JZZZ', mr: '!44' };
const live = (brokenAt: number | null): DataSource => ({
  ...demoSource,
  mode: 'live',
  getTasks: () => [task],
  getLedger: () => chain(),
  getLedgerCheck: () => ({ hash: 'sha256', brokenAt }),
});

describe('a /task load in live mode', () => {
  it('calls verifyChain zero times: loadTasks and firstTaskId read the source’s check', () => {
    setDataSource(live(null));
    vi.mocked(ledger.verifyChain).mockClear();
    loadTasks();
    firstTaskId();
    expect(verifyCalls()).toBe(0);
  });

  it('states the source’s broken link on every task, and Replay says so', () => {
    setDataSource(live(2));
    const t = loadTasks()[0]!;
    expect(t.ledgerCheck).toEqual({ hash: 'sha256', brokenAt: 2 });
    expect(replayMessage(t)).toContain('chain broken at #2');
  });
});
