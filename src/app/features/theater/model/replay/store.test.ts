import { describe, expect, it, vi } from 'vitest';
import { createReplayStore, shallowEqual } from './store';
import { readoutFrom, viewOf } from './state';

describe('replay store', () => {
  it('notifies subscribers on change only, and stops after unsubscribe', () => {
    const store = createReplayStore();
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.dispatch({ type: 'tick', dt: 100 }); // paused: no change
    expect(fn).not.toHaveBeenCalled();
    store.dispatch({ type: 'step', d: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(store.get().i).toBe(1);
    off();
    store.dispatch({ type: 'step', d: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('view slice', () => {
  it('stays equal across film frames and changes on entry or transport changes', () => {
    const store = createReplayStore();
    store.dispatch({ type: 'play', on: true });
    const a = viewOf(store.get());
    store.dispatch({ type: 'tick', dt: 50 });
    expect(shallowEqual(a, viewOf(store.get()))).toBe(true);
    store.dispatch({ type: 'tick', dt: 5000 });
    expect(shallowEqual(a, viewOf(store.get()))).toBe(false);
  });
  it('reads the transport state out of the view', () => {
    expect(readoutFrom({ playing: false, left: 0, rolling: false }).text).toBe('Held');
    expect(readoutFrom({ playing: false, left: 2, rolling: true }).text).toBe('Pre-roll 2…');
    expect(readoutFrom({ playing: true, left: 0, rolling: true })).toEqual({ text: '● Rolling to out', live: true });
    expect(readoutFrom({ playing: true, left: 0, rolling: false })).toEqual({ text: '▶ Free play', live: false });
  });
});
