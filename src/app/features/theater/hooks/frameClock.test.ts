// The frame clock, driven by a counting fake rAF: how many frames it asks for while the film is held, and that it
// still ticks while the film plays, pre-rolls or loops.
import { describe, expect, it } from 'vitest';
import { createReplayStore } from '../model/replay/store';
import { initialState } from '../model/replay/state';
import { frameClock, type FrameHost } from './frameClock';

const FRAME_MS = 1000 / 60;

/** A fake display: `frame()` runs the callbacks queued so far; `callbacks` counts every one that ran. */
function display() {
  let t = 0;
  let next = 1;
  let queue = new Map<number, (now: number) => void>();
  const host: FrameHost = {
    raf: (cb) => {
      queue.set(next, cb);
      return next++;
    },
    caf: (id) => void queue.delete(id),
    now: () => t,
  };
  const out = { host, callbacks: 0, frame() {
    t += FRAME_MS;
    const due = queue;
    queue = new Map();
    due.forEach((cb) => {
      out.callbacks++;
      cb(t);
    });
  } };
  return out;
}

const run = (d: ReturnType<typeof display>, frames: number) => {
  for (let k = 0; k < frames; k++) d.frame();
};

function setup() {
  const store = createReplayStore(initialState());
  const d = display();
  const clock = frameClock(store, d.host);
  return { store, d, clock };
}

describe('frameClock', () => {
  it('asks for no frames in a second of a held film', () => {
    const { store, d, clock } = setup();
    store.dispatch({ type: 'play', on: false });
    clock.start();
    d.callbacks = 0;
    run(d, 60);
    expect(d.callbacks).toBe(0);
  });

  it('wakes on Space, ticks every frame while the film plays, and sleeps again when held', () => {
    const { store, d, clock } = setup();
    clock.start();
    run(d, 5);
    store.dispatch({ type: 'toggle' });
    const t0 = store.get().t;
    d.callbacks = 0;
    run(d, 10);
    expect(store.get().playing).toBe(true);
    expect(store.get().t).toBeGreaterThan(t0);
    expect(d.callbacks).toBe(10);
    store.dispatch({ type: 'toggle' });
    d.callbacks = 0;
    run(d, 30);
    expect(d.callbacks).toBeLessThanOrEqual(1);
  });

  it('counts the first dt of a wake from the wake, not from the idle gap', () => {
    const { store, d, clock } = setup();
    store.dispatch({ type: 'play', on: false });
    clock.start();
    run(d, 600);
    store.dispatch({ type: 'toggle' });
    const t0 = store.get().t;
    d.frame();
    expect(store.get().t - t0).toBeLessThan(FRAME_MS * 2);
  });

  it('pre-rolls, plays through and goes quiet at the end of a roll', () => {
    const { store, d, clock } = setup();
    store.dispatch({ type: 'play', on: false });
    clock.start();
    store.dispatch({ type: 'roll' });
    expect(store.get().preroll).toBeGreaterThan(0);
    for (let k = 0; k < 20000 && d.callbacks < 20000 && (store.get().playing || store.get().preroll > 0); k++) d.frame();
    expect(store.get().playing).toBe(false);
    expect(store.get().preroll).toBe(0);
    d.callbacks = 0;
    run(d, 60);
    expect(d.callbacks).toBe(0);
  });

  it('stays quiet while stopped and resumes when started', () => {
    const { store, d, clock } = setup();
    clock.start();
    clock.stop();
    store.dispatch({ type: 'toggle' });
    d.callbacks = 0;
    run(d, 10);
    expect(d.callbacks).toBe(0);
    clock.start();
    run(d, 10);
    expect(d.callbacks).toBe(10);
  });

  it('calls the host unbound, as the browser requestAnimationFrame and cancelAnimationFrame demand', () => {
    // The DOM's rAF/cAF throw "Illegal invocation" when called as a method of another object (`host.caf(id)`).
    const d = display();
    const strict: FrameHost = {
      raf(cb) {
        if (this !== undefined) throw new TypeError('Illegal invocation');
        return d.host.raf(cb);
      },
      caf(id) {
        if (this !== undefined) throw new TypeError('Illegal invocation');
        d.host.caf(id);
      },
      now: d.host.now,
    };
    const store = createReplayStore(initialState());
    const clock = frameClock(store, strict);
    expect(() => clock.start()).not.toThrow();
    store.dispatch({ type: 'play', on: true });
    expect(() => run(d, 3)).not.toThrow();
    expect(() => clock.stop()).not.toThrow();
  });
});
