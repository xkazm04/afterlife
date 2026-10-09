import { describe, expect, it } from 'vitest';
import { TAKES } from '../../data/constants';
import { REPLAY_LEDGER } from '../../data/ledger';
import { reduce, type Action } from './reducer';
import { N, dwell, indexOfSeq, initialState, prerollLeft, progress, rangeOf, readoutOf, slateText, type ReplayState } from './state';

const run = (s: ReplayState, ...acts: Action[]) => acts.reduce(reduce, s);
const tick = (ms: number): Action => ({ type: 'tick', dt: ms });

describe('slice and takes', () => {
  it('has seq 480..520 in order and takes that tile it without gaps', () => {
    expect(N).toBe(41);
    REPLAY_LEDGER.forEach((e, k) => expect(e.seq).toBe(480 + k));
    expect(TAKES).toHaveLength(8);
    expect(TAKES[0]?.a).toBe(480);
    TAKES.slice(1).forEach((t, k) => expect(t.a).toBe((TAKES[k]?.b ?? 0) + 1));
    expect(TAKES[7]?.b).toBe(520);
  });
});

describe('free play', () => {
  it('advances through an entry by its dwell and into the next', () => {
    let s = run(initialState(), { type: 'play', on: true });
    s = run(s, tick(dwell(0) - 100));
    expect(s.i).toBe(0);
    s = run(s, tick(150));
    expect(s.i).toBe(1);
    expect(s.t).toBe(50);
  });

  it('is deterministic: the same ticks in any chunking land on the same frame', () => {
    const a = run(initialState(), { type: 'play', on: true }, tick(100), tick(100), tick(100));
    let b = run(initialState(), { type: 'play', on: true });
    for (let k = 0; k < 60; k++) b = reduce(b, tick(5));
    const c = run(initialState(), { type: 'play', on: true }, tick(10000));
    const d = run(initialState(), { type: 'play', on: true }, ...Array.from({ length: 100 }, () => tick(100)));
    expect(c.i).toBe(d.i);
    expect(c.t).toBe(d.t);
    expect(a.i).toBe(0);
    expect(b.i).toBe(0);
  });

  it('stops at the last entry and restarts the slice when played again', () => {
    let s = run(initialState(), { type: 'seek', i: N - 1 }, { type: 'play', on: true }, tick(60000));
    expect(s.playing).toBe(false);
    expect(s.i).toBe(N - 1);
    expect(progress(s)).toBe(1);
    s = run(s, { type: 'toggle' });
    expect(s.playing).toBe(true);
    expect(s.i).toBe(0);
  });

  it('does not move while paused', () => {
    const s = initialState();
    expect(reduce(s, tick(500))).toBe(s);
  });
});

describe('stepping, seeking, home and end', () => {
  it('steps one entry, clamps at the ends, and pauses', () => {
    let s = run(initialState(), { type: 'play', on: true }, { type: 'step', d: 1 });
    expect(s.i).toBe(1);
    expect(s.playing).toBe(false);
    s = run(s, { type: 'step', d: -5 });
    expect(s.i).toBe(0);
    s = run(s, { type: 'seek', i: 999 });
    expect(s.i).toBe(N - 1);
  });
});

describe('takes, marks, roll, loop', () => {
  it('cues a take to its in-point, paused, clearing marks', () => {
    let s = run(initialState(), { type: 'cue', take: 5 });
    expect(s.i).toBe(indexOfSeq(505));
    expect(s.take).toBe(5);
    expect(s.playing).toBe(false);
    s = run(s, { type: 'markIn' }, { type: 'cue', take: 2 });
    expect(s.mark).toBeNull();
    expect(rangeOf(s)).toEqual({ a: indexOfSeq(488), b: indexOfSeq(496) });
  });

  it('rolls: in-point, 2 s pre-roll, then plays to the out-point and stops there', () => {
    let s = run(initialState(), { type: 'cue', take: 1 }, { type: 'roll' });
    expect(s.i).toBe(indexOfSeq(485));
    expect(s.stopAt).toBe(indexOfSeq(487));
    expect(s.counts[1]).toBe(1);
    expect(prerollLeft(s)).toBe(2);
    expect(readoutOf(s)).toEqual({ text: 'Pre-roll 2…', live: true });
    s = run(s, tick(1100));
    expect(prerollLeft(s)).toBe(1);
    expect(s.playing).toBe(false);
    s = run(s, tick(1000));
    expect(s.playing).toBe(true);
    expect(readoutOf(s).text).toBe('● Rolling to out');
    s = run(s, tick(100000));
    expect(s.playing).toBe(false);
    expect(s.i).toBe(indexOfSeq(487));
    expect(readoutOf(s).text).toBe('Held');
  });

  it('uses a 1 s pre-roll under reduced motion', () => {
    const s = run(initialState(), { type: 'reduced', on: true }, { type: 'roll' });
    expect(s.preroll).toBe(1000);
  });

  it('marks in and out at the current seq, keeping in <= out, and rolls the marked range', () => {
    let s = run(initialState(), { type: 'cue', take: 2 }, { type: 'seek', i: indexOfSeq(492) }, { type: 'markIn' });
    expect(s.mark).toEqual({ a: indexOfSeq(492), b: indexOfSeq(496) });
    s = run(s, { type: 'seek', i: indexOfSeq(494) }, { type: 'markOut' });
    expect(s.mark).toEqual({ a: indexOfSeq(492), b: indexOfSeq(494) });
    s = run(s, { type: 'seek', i: indexOfSeq(490) }, { type: 'markOut' });
    expect(s.mark).toEqual({ a: indexOfSeq(490), b: indexOfSeq(490) });
    s = run(s, { type: 'roll' });
    expect(s.i).toBe(indexOfSeq(490));
    expect(slateText(s)).toContain('in 490 → out 490 (marked)');
  });

  it('counts rolls per take and numbers them in the slate', () => {
    let s = run(initialState(), { type: 'cue', take: 3 }, { type: 'roll' }, { type: 'roll' });
    expect(s.counts[3]).toBe(2);
    expect(slateText(s)).toContain('take 4.2');
    s = run(s, { type: 'cue', take: 0 });
    expect(slateText(s)).toContain('take 1.1');
  });

  it('loops: after the out-point it waits 800 ms and rolls again; any operator action cancels it', () => {
    let s = run(initialState(), { type: 'cue', take: 7 }, { type: 'toggleLoop' }, { type: 'roll' }, tick(2100), tick(100000));
    expect(s.playing).toBe(false);
    expect(s.loopIn).toBe(800);
    s = run(s, tick(900));
    expect(s.counts[7]).toBe(2);
    expect(s.preroll).toBeGreaterThan(0);
    s = run(s, tick(100000), { type: 'step', d: -1 });
    expect(s.loopIn).toBe(0);
    s = run(initialState(), { type: 'cue', take: 7 }, { type: 'toggleLoop' }, { type: 'roll' }, tick(2100), tick(100000), { type: 'toggleLoop' });
    expect(s.loopIn).toBe(0);
  });

  it('Space during a roll pauses it; Space again free-plays', () => {
    let s = run(initialState(), { type: 'cue', take: 0 }, { type: 'roll' }, tick(2100));
    s = run(s, { type: 'toggle' });
    expect(s.playing).toBe(false);
    expect(s.stopAt).not.toBeNull();
    s = run(s, { type: 'toggle' });
    expect(s.stopAt).toBeNull();
    expect(readoutOf(s).text).toBe('▶ Free play');
  });
});

describe('the selected take follows the playhead', () => {
  it('follows when free, holds during a roll or with marks', () => {
    let s = run(initialState(), { type: 'seek', i: indexOfSeq(510) });
    expect(s.take).toBe(5);
    s = run(s, { type: 'roll' });
    s = run(s, { type: 'seek', i: indexOfSeq(500) });
    expect(s.take).toBe(3);
    s = run(initialState(), { type: 'seek', i: indexOfSeq(510) }, { type: 'markIn' }, { type: 'seek', i: indexOfSeq(484) });
    expect(s.take).toBe(5);
  });

  it('a cued take from the URL shows its settled frame, paused', () => {
    const s = run(initialState(), { type: 'settled', i: indexOfSeq(510) });
    expect(s.playing).toBe(false);
    expect(progress(s)).toBe(1);
    expect(s.take).toBe(5);
  });
});
