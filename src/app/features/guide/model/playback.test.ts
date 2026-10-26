import { describe, expect, it } from 'vitest';
import { autoAdvances, playback, startPlayback } from './playback';
import { STEPS, stepIndex } from './steps';

const last = STEPS.length - 1;

describe('guide playback', () => {
  it('starts on step one, playing unless motion is reduced', () => {
    expect(startPlayback(false)).toEqual({ i: 0, playing: true });
    expect(startPlayback(true)).toEqual({ i: 0, playing: false });
  });

  it('a manual move stops autoplay and stays inside the story', () => {
    const p = startPlayback(false);
    expect(playback(p, { type: 'next' })).toEqual({ i: 1, playing: false });
    expect(playback(p, { type: 'prev' })).toEqual({ i: 0, playing: false });
    expect(playback(p, { type: 'go', to: 99 })).toEqual({ i: last, playing: false });
  });

  it('a tick moves on only from the step it was armed on', () => {
    const p = startPlayback(false);
    expect(playback(p, { type: 'tick', at: 0 })).toEqual({ i: 1, playing: true });
    expect(playback({ i: 3, playing: true }, { type: 'tick', at: 2 })).toEqual({ i: 3, playing: true });
  });

  it('a holding step waits for the person', () => {
    const run = stepIndex('run');
    expect(STEPS[run]?.hold).toBe(true);
    const p = { i: run, playing: true };
    expect(autoAdvances(p)).toBe(false);
    expect(playback(p, { type: 'tick', at: run })).toBe(p);
  });

  it('play from the end starts over', () => {
    expect(playback({ i: last, playing: false }, { type: 'toggle' })).toEqual({ i: 0, playing: true });
    expect(playback({ i: 4, playing: true }, { type: 'toggle' })).toEqual({ i: 4, playing: false });
  });

  it('every step but the recap names a screen and an element to light', () => {
    for (const s of STEPS.slice(0, -1)) {
      expect(s.href.startsWith('/')).toBe(true);
      expect(s.target?.sel).toBeTruthy();
    }
    expect(STEPS[last]?.target).toBeNull();
  });
});
