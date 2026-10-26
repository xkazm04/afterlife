import { afterEach, describe, expect, it, vi } from 'vitest';
import { activate, resetHostForTests, configureHost, getState } from '../host/hooks/store';
import { matchRoute } from '../host/model/routes';
import { markOf, navDue, onHostNav } from './hostNav';

// The shell re-reads when the screen host shows another screen or starts a read of the one showing (a return, a poll,
// a write's revalidate), debounced; never when the host leaves (a route it does not draw) or a read only progresses.
describe('navDue', () => {
  const at = (path: string | null, reading = false) => ({ path, reading });
  it('another screen showing is due', () => {
    expect(navDue(at('/fleet'), at('/runs'))).toBe(true);
    expect(navDue(at(null), at('/runs'))).toBe(true);
  });
  it('a read of the screen showing beginning is due; one going on or ending is not', () => {
    expect(navDue(at('/runs'), at('/runs', true))).toBe(true);
    expect(navDue(at('/runs', true), at('/runs', true))).toBe(false);
    expect(navDue(at('/runs', true), at('/runs'))).toBe(false);
  });
  it('leaving the host is not due', () => {
    expect(navDue(at('/runs'), at(null))).toBe(false);
  });
});

describe('onHostNav over the host store', () => {
  afterEach(() => {
    resetHostForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('a burst of host switches is one shell read, after the debounce', () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined))); // the screen streams never answer here
    configureHost({ isReady: () => true, declared: () => [], redirect: () => undefined });
    const read = vi.fn();
    const off = onHostNav(read, 300);
    for (const p of ['/runs', '/start', '/theater']) activate(matchRoute(p), true);
    expect(markOf(getState()).path).toBe('/theater');
    expect(read).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(read).toHaveBeenCalledTimes(1);
    off();
    activate(matchRoute('/runs'), true);
    vi.advanceTimersByTime(300);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
