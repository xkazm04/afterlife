import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadTasks } from '../model/build/loadTasks';
import { firstTaskSlice, loaders } from './slices';

afterEach(() => setDataSource(null));

const ctx = (params: Record<string, string> = {}, q = '') => ({ params, search: new URLSearchParams(q), signal: new AbortController().signal });
const task = loaders.task?.slices;
const one = loaders['task/[id]']?.slices;

describe('/task on the stream', () => {
  it('redirects to the docket’s first task, its id one encoded segment', () => {
    expect(firstTaskSlice([{ id: 'a b' }], new URLSearchParams())).toEqual({ status: 'redirect', to: '/task/a%20b' });
  });

  it('carries the query, so the X-ray link lands on the first task with the X-ray on', () => {
    expect(firstTaskSlice([{ id: 'a b' }], new URLSearchParams('xray=1'))).toEqual({ status: 'redirect', to: '/task/a%20b?xray=1' });
  });

  it('an empty docket is an empty list the Task window says it holds, never a redirect', () => {
    expect(firstTaskSlice([], new URLSearchParams('xray=1'))).toEqual({ status: 'ok', data: [] });
  });

  it('the demo docket redirects to its first task', () => {
    setDataSource(demoSource);
    expect(task?.docket?.(ctx())).toEqual({ status: 'redirect', to: `/task/${encodeURIComponent(loadTasks()[0]!.id)}` });
  });
});

describe('/task/<id> on the stream', () => {
  it('the docket is light rows: no task ships every task’s ledger any more', () => {
    setDataSource(demoSource);
    const r = one?.docket?.(ctx({ id: '01J8Q8' })) as { status: string; data: unknown[] };
    expect(r?.status).toBe('ok');
    const rows = r.data;
    expect(rows).toHaveLength(loadTasks().length);
    expect(JSON.stringify(rows)).not.toContain('"ledger"');
  });

  it('the detail is the task without its ledger; the ledger is its own slice', () => {
    setDataSource(demoSource);
    const full = loadTasks().find((t) => t.id === '01J8Q8')!;
    const detail = one?.detail?.(ctx({ id: '01J8Q8' })) as { status: 'ok'; data: Record<string, unknown> };
    expect(detail.status).toBe('ok');
    expect(detail.data).not.toHaveProperty('ledger');
    expect(detail.data).toMatchObject({ id: '01J8Q8', title: full.title });
    expect(one?.ledger?.(ctx({ id: '01J8Q8' }))).toEqual({ status: 'ok', data: { ledger: full.ledger, ledgerCheck: full.ledgerCheck } });
  });

  it('an id the docket does not hold is notFound, for the task and its ledger', () => {
    setDataSource(demoSource);
    expect(one?.detail?.(ctx({ id: 'nope' }))).toEqual({ status: 'notFound' });
    expect(one?.ledger?.(ctx({ id: 'nope' }))).toEqual({ status: 'notFound' });
  });

  it('the page facts: demo says so', () => {
    setDataSource(demoSource);
    expect(one?.page?.(ctx({ id: '01J8Q8' }))).toMatchObject({ status: 'ok', data: { live: false } });
  });
});
