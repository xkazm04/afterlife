import { describe, expect, it } from 'vitest';
import { REPLAY_LEDGER } from '../../data/ledger';
import { motionAt } from '../../model/derive/climb';
import { buildSnapshots } from '../../model/derive/snapshots';
import { initialState, progress } from '../../model/replay/state';
import { createReplayStore } from '../../model/replay/store';
import { sameFrame, wallFrame } from './wallFrame';

const snaps = buildSnapshots(REPLAY_LEDGER, []);
const FRAME_MS = 1000 / 60;

/** Play the whole illustrative film at 60 fps; count the frames on which the wall's slice changed (= its renders). */
function playThrough(reduced: boolean): { frames: number; redraws: number; stale: number } {
  const store = createReplayStore({ ...initialState(), reduced });
  store.dispatch({ type: 'play', on: true });
  const select = wallFrame(snaps, true);
  let shown = select(store.get());
  let frames = 0;
  let redraws = 0;
  let stale = 0;
  while (store.get().playing && frames < 100_000) {
    store.dispatch({ type: 'tick', dt: FRAME_MS });
    frames++;
    const s = store.get();
    const next = select(s);
    if (!sameFrame(next, shown)) {
      redraws++;
      shown = next;
    }
    // what is on screen must always equal what the raw (entry, progress) pair would draw
    const snap = snaps[s.i]!;
    const truth = motionAt(snap.e, snap.beat, progress(s), s.reduced, { from: snap.from, side: true });
    if (!sameFrame(shown, { i: s.i, ...truth })) stale++;
  }
  return { frames, redraws, stale };
}

describe('the wall redraws when something moves, not every frame', () => {
  it('never shows a stale frame', () => {
    expect(playThrough(false).stale).toBe(0);
    expect(playThrough(true).stale).toBe(0);
  });
  it('under reduced motion it redraws once per entry change, not once per frame', () => {
    const r = playThrough(true);
    expect(r.frames).toBeGreaterThan(5000);
    expect(r.redraws).toBeLessThanOrEqual(REPLAY_LEDGER.length);
  });
  it('with motion it redraws far less than once per frame (the climbs settle before the dwell ends)', () => {
    const r = playThrough(false);
    expect(r.redraws).toBeLessThan(r.frames / 4);
  });
  it('a position with no snapshot is no frame', () => {
    const store = createReplayStore({ ...initialState(), i: 9999 });
    expect(wallFrame(snaps, true)(store.get())).toBeNull();
    expect(sameFrame(null, null)).toBe(true);
  });
});
