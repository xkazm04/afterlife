import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { matchRoute } from '../model/routes';
import { activate, configureHost, getState, resetHostForTests } from './store';

// The host's store against a fake fetch: each call hands the test a body it writes NDJSON into, chunk by chunk.
interface Call {
  url: string;
  signal: AbortSignal;
  push: (text: string) => void;
  end: () => void;
}
let calls: Call[] = [];
const enc = new TextEncoder();
const redirect = vi.fn();

beforeEach(() => {
  resetHostForTests();
  calls = [];
  redirect.mockReset();
  configureHost({
    isReady: (k) => k === 'monitor' || k === 'fleet/[project]' || k === 'task' || k === 'fleet' || k === 'task/[id]' || k === 'kit',
    declared: (k) => (k === 'kit' ? [] : ['core', 'desk']),
    paramSlices: (k) => (k === 'task/[id]' ? ['core'] : []),
    redirect,
  });
  vi.stubGlobal('fetch', (url: string, init: { signal: AbortSignal }) => {
    if (url === '/api/screen/task') return Promise.resolve(Response.json({ error: 'nope' }, { status: 403 }));
    let ctl!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start: (c) => void (ctl = c) });
    calls.push({ url, signal: init.signal, push: (t) => ctl.enqueue(enc.encode(t)), end: () => ctl.close() });
    return Promise.resolve(new Response(body, { status: 200 }));
  });
});
afterEach(() => vi.unstubAllGlobals());

const tick = () => new Promise((r) => setTimeout(r, 5));
const go = (path: string, reread = true) => activate(matchRoute(path), reread);
const line = (slice: string, extra: object = {}) => `${JSON.stringify({ slice, status: 'ok', asOf: '2026-10-26T10:00:00.000Z', ...extra })}\n`;

describe('the host store', () => {
  it('a claimed URL becomes the screen, and its slices fill line by line, a torn line waiting for its end', async () => {
    go('/monitor');
    expect(getState().loc?.key).toBe('monitor');
    expect(getState().entries.monitor).toMatchObject({ reading: true, slices: {} });
    await tick();
    expect(calls[0]?.url).toBe('/api/screen/monitor');
    const core = line('core', { data: { n: 1 } });
    calls[0]?.push(core.slice(0, 10));
    await tick();
    expect(getState().entries.monitor?.slices.core).toBeUndefined();
    calls[0]?.push(core.slice(10) + line('_end'));
    calls[0]?.end();
    await tick();
    expect(getState().entries.monitor?.slices.core).toMatchObject({ state: 'ok', data: { n: 1 } });
    expect(getState().entries.monitor).toMatchObject({ reading: false });
    expect(getState().entries.monitor?.slices.desk).toEqual({ state: 'error', reason: 'not served' }); // declared, never sent
  });

  it('an unclaimed URL leaves the route its page', () => {
    go('/ladder');
    expect(getState().loc).toBeNull();
  });

  it('leaving aborts the read; returning keeps the read slices and re-reads them quietly', async () => {
    go('/monitor');
    await tick();
    calls[0]?.push(line('core', { data: 1 }));
    await tick();
    go('/fleet/p1');
    expect(calls[0]?.signal.aborted).toBe(true);
    expect(getState().order).toEqual(['fleet/[project]', 'monitor']);
    go('/monitor');
    expect(getState().entries.monitor?.slices.core).toMatchObject({ state: 'ok', data: 1 });
    await tick();
    expect(calls).toHaveLength(3);
    expect(calls[1]?.url).toBe('/api/screen/fleet%2F%5Bproject%5D?project=p1');
  });

  it('another param is another instance: it starts unread', async () => {
    go('/fleet/p1');
    await tick();
    calls[0]?.push(line('core', { data: 'p1' }));
    await tick();
    go('/fleet/p2');
    expect(getState().entries['fleet/[project]']).toMatchObject({ instance: '/fleet/p2', slices: {} });
    calls[0]?.push(line('desk', { data: 'late' })); // the old read's late line lands nowhere
    await tick();
    expect(getState().entries['fleet/[project]']?.slices.desk).toBeUndefined();
  });

  it('a query-only change neither resets nor re-reads', async () => {
    go('/monitor');
    await tick();
    activate(matchRoute('/monitor', '?x=1'), false);
    await tick();
    expect(calls).toHaveLength(1);
    expect(getState().loc?.search).toBe('x=1');
  });

  it('a redirect line on the showing screen replaces the URL', async () => {
    go('/fleet/p1');
    await tick();
    calls[0]?.push(`${JSON.stringify({ slice: 'core', status: 'redirect', to: '/fleet/p9', asOf: 'x' })}\n`);
    await tick();
    expect(redirect).toHaveBeenCalledWith('/fleet/p9');
  });

  it('a refused read (403) fails every slice with not-local; a cut stream fails what it never answered', async () => {
    go('/task');
    await tick();
    expect(getState().entries.task?.slices).toEqual({ core: { state: 'error', reason: 'not-local' }, desk: { state: 'error', reason: 'not-local' } });
    go('/monitor');
    await tick();
    calls[0]?.push(line('core', { data: 1 }));
    calls[0]?.end();
    await tick();
    expect(getState().entries.monitor?.slices.desk).toEqual({ state: 'error', reason: 'unreadable' });
    expect(getState().entries.monitor?.slices.core).toMatchObject({ state: 'ok' });
  });

  it('a redirect drops the redirecting screen’s query: a plain link back must not land on the redirect again', async () => {
    activate(matchRoute('/fleet', '?project=p1'), true);
    await tick();
    calls[0]?.push(`${JSON.stringify({ slice: 'core', status: 'redirect', to: '/fleet/p1', asOf: 'x' })}
`);
    await tick();
    expect(redirect).toHaveBeenCalledWith('/fleet/p1');
    expect(getState().locs.fleet?.search).toBe('');
  });

  it('paramSlices: another param keeps the other slices and reads only the param ones (and any not read yet)', async () => {
    go('/task/a');
    await tick();
    calls[0]?.push(line('core', { data: 'a' }) + line('desk', { data: 'docket' }) + line('_end'));
    calls[0]?.end();
    await tick();
    go('/task/b');
    expect(getState().entries['task/[id]']?.slices.desk).toMatchObject({ state: 'ok', data: 'docket' });
    expect(getState().entries['task/[id]']?.slices.core).toBeUndefined();
    await tick();
    expect(calls[1]?.url).toBe('/api/screen/task%2F%5Bid%5D?id=b&_slices=core');
    calls[1]?.push(line('core', { data: 'b' }) + line('_end'));
    calls[1]?.end();
    await tick();
    expect(getState().entries['task/[id]']).toMatchObject({ instance: '/task/b', reading: false });
    expect(getState().entries['task/[id]']?.slices.desk).toMatchObject({ state: 'ok', data: 'docket' }); // not failed as 'not served'
    expect(getState().entries['task/[id]']?.slices.core).toMatchObject({ state: 'ok', data: 'b' });
  });

  it('a screen that declares no slice reads nothing (no 404 for settings or the kit)', async () => {
    go('/kit');
    await tick();
    expect(calls).toHaveLength(0);
    expect(getState().entries.kit).toMatchObject({ reading: false });
  });
});
