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
  it('BASELINE: asks for a frame per display frame, 60 in a second, of a held film', () => {
    const { store, d, clock } = setup();
    store.dispatch({ type: 'play', on: false });
    clock.start();
    d.callbacks = 0;
    run(d, 60);
    expect(d.callbacks).toBe(60);
  });

  it('ticks every frame while the film plays', () => {
    const { store, d, clock } = setup();
    store.dispatch({ type: 'play', on: false });
    clock.start();
    store.dispatch({ type: 'toggle' });
    const t0 = store.get().t;
    run(d, 10);
    expect(store.get().t).toBeGreaterThan(t0);
    expect(d.callbacks).toBe(10);
  });
});
