// useStill: still after `ms` with no input, awake again on any input, and a pointer sweep does not re-arm a timer per event.
// No DOM environment here: react's two hooks are replaced by a one-shot runtime and window by a listener table.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rt = vi.hoisted(() => ({ still: false, sets: [] as boolean[], cleanup: undefined as (() => void) | undefined }));
vi.mock('react', () => ({
  useState: () => [rt.still, (v: boolean) => { rt.still = v; rt.sets.push(v); }],
  useEffect: (fn: () => void | (() => void)) => void (rt.cleanup = fn() ?? undefined),
}));
const { useStill } = await import('./useStill');

const on: Record<string, () => void> = {};
const fire = (type: string) => on[type]!();
beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(rt, { still: false, sets: [], cleanup: undefined });
  vi.stubGlobal('window', { addEventListener: (t: string, f: () => void) => (on[t] = f), removeEventListener: (t: string) => delete on[t] });
});
afterEach(() => {
  rt.cleanup?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useStill', () => {
  it('goes still after ms with no input, not before', () => {
    useStill(1000);
    vi.advanceTimersByTime(999);
    expect(rt.still).toBe(false);
    vi.advanceTimersByTime(1);
    expect(rt.still).toBe(true);
  });
  it('an input restarts the wait, and wakes a still page', () => {
    useStill(1000);
    vi.advanceTimersByTime(600);
    fire('pointermove');
    vi.advanceTimersByTime(999);
    expect(rt.still).toBe(false);
    vi.advanceTimersByTime(1);
    expect(rt.still).toBe(true);
    fire('keydown');
    expect(rt.still).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(rt.still).toBe(true);
  });
  it('a pointer sweep of 1,000 events arms no timer per event and sets no state while awake', () => {
    useStill(1000);
    const arm = vi.spyOn(globalThis, 'setTimeout');
    const disarm = vi.spyOn(globalThis, 'clearTimeout');
    for (let i = 0; i < 1000; i++) {
      vi.advanceTimersByTime(0.5);
      fire('pointermove');
    }
    expect(arm.mock.calls.length + disarm.mock.calls.length).toBeLessThanOrEqual(2);
    expect(rt.sets).toEqual([]);
  });
  it('unmounting removes every listener', () => {
    useStill(1000);
    rt.cleanup!();
    rt.cleanup = undefined;
    expect(Object.keys(on)).toEqual([]);
  });
});
