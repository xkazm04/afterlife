// The shell's client sync, as pure steps: requests are numbered, the newest answer wins, a server render voids every
// request before it, and a failed read changes nothing.
import { createElement, type ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShellProvider, useShellInfo, type ShellInfo } from '../ShellContext';
import { initSync, readAnswer, shouldSync, syncReducer, type SyncAction, type SyncState } from './sync';

const info = (needsYouCount: number): ShellInfo => ({
  needsYouCount,
  data: { mode: 'live', fakeGitlab: false, group: 'acme', illustrative: false, poll: null },
});
const run = (s: SyncState, ...actions: SyncAction[]) => actions.reduce(syncReducer, s);
const issued = (s: SyncState, n: number) => run(s, ...Array.from({ length: n }, () => ({ type: 'issue' }) as const));

afterEach(() => vi.unstubAllGlobals());

describe('syncReducer', () => {
  it('a late answer to an older request is ignored; a newer one is adopted', () => {
    let s = issued(initSync(info(1)), 3); // requests #1..#3
    s = run(s, { type: 'answer', id: 3, info: info(3) });
    expect(s.info.needsYouCount).toBe(3);
    s = run(s, { type: 'answer', id: 2, info: info(2) });
    expect(s.info.needsYouCount).toBe(3);
    s = run(s, { type: 'issue' }, { type: 'answer', id: 4, info: info(4) });
    expect(s.info.needsYouCount).toBe(4);
  });

  it('a failed read (rejected fetch, non-200) leaves the state as it was, and throws nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    const rejected = await readAnswer();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({ error: 'first poll has not finished' }, { status: 503 }))));
    const unavailable = await readAnswer();
    expect([rejected, unavailable]).toEqual([null, null]);

    const before = run(initSync(info(1)), { type: 'issue' });
    const after = run(before, { type: 'answer', id: 1, info: rejected });
    expect(after.info).toBe(before.info);
    expect(after.inFlight).toBeNull(); // the next trigger may read again
  });

  it('reads a 200 answer as the shell info', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json(info(7)))));
    expect(await readAnswer()).toEqual(info(7));
  });

  it('a new server prop (the layout re-rendered by refresh()) is adopted at once and voids every earlier request', () => {
    let s = issued(initSync(info(1)), 2);
    s = run(s, { type: 'server', info: info(9) });
    expect(s.info.needsYouCount).toBe(9);
    s = run(s, { type: 'answer', id: 1, info: info(1) }, { type: 'answer', id: 2, info: info(2) });
    expect(s.info.needsYouCount).toBe(9);
    s = run(s, { type: 'issue' }, { type: 'answer', id: 3, info: info(10) });
    expect(s.info.needsYouCount).toBe(10);
  });
});

describe('shouldSync', () => {
  const idle = initSync(info(1));
  it('re-reads on regained focus and on a host navigation (a router route change is no trigger: useShellSync.test.ts)', () => {
    expect(shouldSync(idle, { kind: 'focus' })).toBe(true);
    expect(shouldSync(idle, { kind: 'nav' })).toBe(true);
  });

  it('a second focus or navigation while a request is in flight issues no second request', () => {
    const busy = run(idle, { type: 'issue' });
    expect(shouldSync(busy, { kind: 'focus' })).toBe(false);
    expect(shouldSync(busy, { kind: 'nav' })).toBe(false);
  });

  it('an ask always reads: what it follows changed after the read in flight began (the newest answer wins)', () => {
    expect(shouldSync(run(idle, { type: 'issue' }), { kind: 'ask' })).toBe(true);
  });
});

describe('ShellProvider without sync (guard: the tests and the kit)', () => {
  it('provides its value and issues no fetch', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const Count = () => String(useShellInfo().needsYouCount);
    expect(renderToString(createElement(ShellProvider, { value: info(4) } as ComponentProps<typeof ShellProvider>, createElement(Count)))).toBe('4');
    expect(fetch).not.toHaveBeenCalled();
  });
});
