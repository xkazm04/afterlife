import { afterEach, describe, expect, it } from 'vitest';
import { getTasks } from '@/lib/demo';
import { demoSource } from '@/server/data/demoSource';
import { setDataSource } from '@/server/data/select';
import type { DataSource } from '@/server/data/types';
import { TASK_ORDER } from '../../data/details';
import { verdictCounts, statusLine } from '../docket/filters';
import { firstTaskId, loadTasks } from './loadTasks';
import { loadPageFacts } from './loadPage';

const v204 = getTasks().filter((t) => t.id === '01J8Q4');
const FIXTURE_ONLY = ['01J8Q7', '01J8Q8', '01J8QA'];

const live = (over: Partial<DataSource> = {}): DataSource => ({
  ...demoSource,
  mode: 'live',
  getTasks: () => v204,
  deepProjectId: () => 'ledgerline',
  ...over,
});
afterEach(() => setDataSource(null));

describe('the docket in live mode', () => {
  it('holds only the source’s tasks: no fixture-only task is drawn or counted', () => {
    setDataSource(live());
    const tasks = loadTasks();
    expect(tasks.map((t) => t.id)).toEqual(['01J8Q4']);
    expect(verdictCounts(tasks)).toEqual({ all: 1, pass: 1, fail: 0 });
    for (const id of FIXTURE_ONLY) expect(tasks.find((t) => t.id === id)).toBeUndefined();
    expect(firstTaskId()).toBe('01J8Q4');
  });

  it('keeps the render detail a source task with a fixture gets in demo mode', () => {
    const demo = JSON.stringify(loadTasks().find((t) => t.id === '01J8Q4'));
    setDataSource(live());
    expect(JSON.stringify(loadTasks()[0])).toBe(demo);
  });

  it('names a task the docket draws when the source has none of the fixtures first', () => {
    setDataSource(live({ getTasks: () => getTasks().filter((t) => t.id === '01J8QB') }));
    expect(firstTaskId()).toBe('01J8QB');
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
