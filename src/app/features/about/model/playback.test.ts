import { describe, expect, it } from 'vitest';
import { filmReducer, initialFilm, type FilmAction, type FilmState } from './playback';

const run = (s: FilmState, ...as: FilmAction[]) => as.reduce(filmReducer, s);
const film = (beat = 0, playing = false): FilmState => ({ ...initialFilm(9), phase: 'film', beat, playing });

describe('film playback', () => {
  it('opens on the intro, at the first beat, not playing', () => {
    expect(initialFilm(9)).toEqual({ n: 9, beat: 0, phase: 'intro', playing: false });
  });

  it('ends the intro on the first beat, playing when autoplay is allowed', () => {
    expect(run(initialFilm(9), { type: 'endIntro', autoplay: true })).toMatchObject({ phase: 'film', beat: 0, playing: true });
    expect(run(initialFilm(9), { type: 'endIntro', autoplay: false })).toMatchObject({ phase: 'film', playing: false });
  });

  it('a skip ends the intro without playing, and a late endIntro changes nothing', () => {
    const s = run(initialFilm(9), { type: 'skipIntro' });
    expect(s).toMatchObject({ phase: 'film', beat: 0, playing: false });
    expect(run(s, { type: 'next' }, { type: 'endIntro', autoplay: true })).toMatchObject({ beat: 1, playing: false });
  });

  it('steps next and prev, clamped to the film', () => {
    expect(run(film(3), { type: 'next' }).beat).toBe(4);
    expect(run(film(3), { type: 'prev' }).beat).toBe(2);
    expect(run(film(0), { type: 'prev' }).beat).toBe(0);
    expect(run(film(8), { type: 'next' }).beat).toBe(8);
    expect(run(film(2), { type: 'goto', beat: 42 }).beat).toBe(8);
    expect(run(film(2), { type: 'goto', beat: -3 }).beat).toBe(0);
    expect(run(film(4), { type: 'last' }).beat).toBe(8);
    expect(run(film(4), { type: 'first' }).beat).toBe(0);
  });

  it('a scrub stops the film playing by itself', () => {
    expect(run(film(3, true), { type: 'next' }).playing).toBe(false);
    expect(run(film(3, true), { type: 'goto', beat: 6 })).toMatchObject({ beat: 6, playing: false });
  });

  it('a scrub during the intro ends it on the beat asked for', () => {
    expect(run(initialFilm(9), { type: 'goto', beat: 5 })).toMatchObject({ phase: 'film', beat: 5, playing: false });
  });

  it('autoplay ticks through every beat and stops on the summary', () => {
    let s = run(initialFilm(9), { type: 'endIntro', autoplay: true });
    const seen = [s.beat];
    for (let k = 0; k < 20; k++) {
      s = filmReducer(s, { type: 'tick' });
      if (seen[seen.length - 1] !== s.beat) seen.push(s.beat);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(s).toMatchObject({ beat: 8, playing: false });
  });

  it('a tick does nothing while paused or in the intro', () => {
    expect(run(film(3), { type: 'tick' }).beat).toBe(3);
    expect(run(initialFilm(9), { type: 'tick' })).toEqual(initialFilm(9));
  });

  it('toggles play and pause; play on the summary replays from the start', () => {
    expect(run(film(3), { type: 'toggle' })).toMatchObject({ beat: 3, playing: true });
    expect(run(film(3, true), { type: 'toggle' })).toMatchObject({ beat: 3, playing: false });
    expect(run(film(8), { type: 'toggle' })).toMatchObject({ beat: 0, playing: true });
  });

  it('a one-beat film never plays', () => {
    expect(run(initialFilm(1), { type: 'endIntro', autoplay: true }).playing).toBe(false);
    expect(run({ ...initialFilm(1), phase: 'film' }, { type: 'toggle' }).playing).toBe(false);
  });
});
