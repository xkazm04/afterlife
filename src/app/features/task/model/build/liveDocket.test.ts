import { afterEach, describe, expect, it } from 'vitest';
import { getTasks, type Task } from '@/lib/demo';
import { append, verifyChain, type LedgerEvent } from '@/schemas/ledger';
import { demoSource } from '@/server/data/demoSource';
import { setDataSource } from '@/server/data/select';
import type { DataSource } from '@/server/data/types';
import { TASK_ORDER } from '../../data/details';
import { verdictCounts, statusLine } from '../docket/filters';
import { REPLAY_NOTHING, replayMessage } from '../verdict/replay';
import { firstTaskId, loadTasks } from './loadTasks';
import { loadPageFacts } from './loadPage';
import type { TaskView } from '../types';

const v204 = getTasks().filter((t) => t.id === '01J8Q4');
const FIXTURE_ONLY = ['01J8Q7', '01J8Q8', '01J8QA'];

/** A live source over `over`; its chain check is its own ledger verified, as the live source's snapshot verifies it. */
const live = (over: Partial<DataSource> = {}): DataSource => {
  const ds: DataSource = { ...demoSource, mode: 'live', getTasks: () => v204, deepProjectId: () => 'ledgerline', ...over };
  return { ...ds, getLedgerCheck: () => ({ hash: 'sha256', brokenAt: verifyChain(ds.getLedger()) }) };
};
afterEach(() => setDataSource(null));

describe('the docket in live mode', () => {
  it('holds only the source’s tasks: no fixture-only task is drawn or counted', () => {
    setDataSource(live());
    const tasks = loadTasks();
    expect(tasks.map((t) => t.id)).toEqual(['01J8Q4']);
    expect(verdictCounts(tasks)).toEqual({ all: 1, pass: 1, fail: 0, open: 0 });
    for (const id of FIXTURE_ONLY) expect(tasks.find((t) => t.id === id)).toBeUndefined();
    expect(firstTaskId()).toBe('01J8Q4');
  });

  it('keeps the render detail a source task with a fixture gets in demo mode, all but the ledger', () => {
    const omit = (t: TaskView | undefined) => JSON.stringify(t, (k: string, v: unknown) => (k === 'ledger' || k === 'ledgerCheck' ? undefined : v));
    const demo = omit(loadTasks().find((t) => t.id === '01J8Q4'));
    setDataSource(live());
    expect(omit(loadTasks()[0])).toBe(demo);
  });

  it('names a task the docket draws when the source has none of the fixtures first', () => {
    setDataSource(live({ getTasks: () => getTasks().filter((t) => t.id === '01J8QB') }));
    expect(firstTaskId()).toBe('01J8QB');
  });
});

/** Five events built with the schema's append: merge request !44 at seq 1, 3, 5 and !12 at seq 2, 4. */
function mrChain(): LedgerEvent[] {
  const chain: LedgerEvent[] = [];
  for (const iid of [44, 12, 44, 12, 44]) {
    const n = chain.length + 1;
    const body = { at: `2026-10-16T09:0${n}:00Z`, agent: 'ai-patcher-acme', action_class: 'dep_bump', kind: 'proof_verdict', tier_at_time: 'supervised' } as const;
    chain.push(append(chain, { ...body, subject: { project_id: 7, type: 'mr', iid }, payload_ref: `proofs/mr-${iid}/${n}.json`, observed_by: 'ci_job' }));
  }
  return chain;
}
/** A source task the screen has no fixture for. */
const bare = (mr: string | null): Task => ({ ...v204[0]!, id: '01JZZZ', mr });

describe('the Task ledger in live mode: the merge request’s slice of the real chain', () => {
  it('draws a fixtureless task’s rows from its merge request’s events, with their seq, sha256 hash and prev_hash', () => {
    const chain = mrChain();
    setDataSource(live({ getTasks: () => [bare('!44')], getLedger: () => chain }));
    const t = loadTasks()[0]!;
    expect(t.fixture).toBe(false);
    expect(t.ledger.map((r) => r.seq)).toEqual([1, 3, 5]);
    for (const r of t.ledger) {
      const e = chain.find((x) => x.seq === r.seq)!;
      expect(r.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(r.hash).toBe(e.hash);
      expect(r.prev).toBe(e.prev_hash);
      expect(r.text).toBe(`${e.agent} · ${e.payload_ref}`);
      expect(r.kind).toBe(e.kind);
    }
    expect(t.ledgerCheck).toEqual({ hash: 'sha256', brokenAt: null });
  });

  it('never draws the fixture’s rows: a task whose merge request the chain does not name holds none', () => {
    setDataSource(live({ getLedger: () => mrChain() }));
    const t = loadTasks()[0]!;
    expect([t.id, t.mr, t.fixture]).toEqual(['01J8Q4', '!41', true]);
    expect(t.ledger).toEqual([]);
    expect(t.ledgerCheck.hash).toBe('sha256');
  });

  it('states a chain broken after append, and Replay says so', () => {
    const chain = mrChain();
    chain[2] = { ...chain[2]!, payload_ref: 'proofs/forged.json' };
    setDataSource(live({ getTasks: () => [bare('!44')], getLedger: () => chain }));
    const t = loadTasks()[0]!;
    expect(t.ledgerCheck.brokenAt).toBe(3);
    expect(replayMessage(t)).toContain('chain broken at #3');
    expect(replayMessage(t)).not.toContain('hashes match');
  });

  it('GUARD: a fixtureless task with no merge request holds no rows, and Replay has nothing to replay', () => {
    setDataSource(live({ getTasks: () => [bare(null)], getLedger: () => mrChain() }));
    const t = loadTasks()[0]!;
    expect(t.ledger).toEqual([]);
    expect(REPLAY_NOTHING).toContain('no ledger rows');
  });
});

describe('the docket in demo mode', () => {
  it('is the seven fixtures in order', () => {
    setDataSource(demoSource);
    expect(loadTasks().map((t) => t.id)).toEqual([...TASK_ORDER]);
  });
});

describe('the page facts', () => {
  it('live: subtitle and poll age come from the source', () => {
    const base = demoSource.getCockpit();
    setDataSource(live({ getCockpit: () => ({ ...base, feed: { ...base.feed, lastPollSec: 7 } }) }));
    const page = loadPageFacts();
    const p = demoSource.getFleet().projects.find((x) => x.id === 'ledgerline');
    expect(page).toEqual({ live: true, subtitle: `${p?.group} / ${p?.name}`, pollAgeSec: 7 });
  });

  it('live: a poll age that is not a real number is null, and the status says no read', () => {
    const base = demoSource.getCockpit();
    setDataSource(live({ getCockpit: () => ({ ...base, feed: { ...base.feed, lastPollSec: Number.NaN } }) }));
    expect(loadPageFacts().pollAgeSec).toBeNull();
    expect(statusLine([], null, null)).toContain('ledger not read yet');
  });

  it('demo: the prototype’s constants', () => {
    setDataSource(demoSource);
    expect(loadPageFacts()).toEqual({ live: false, subtitle: 'acme-lab / ledgerline', pollAgeSec: 12 });
  });
});
