import { describe, expect, it } from 'vitest';
import { modeParamsOf, pickFilm, type LiveRead } from './pick';

const wave = (running: boolean) => ({ repo: 'alpha', wave: 2, running, endedAt: running ? undefined : '2026-10-26T10:00:00Z' });
const payload = (...waves: ReturnType<typeof wave>[]): LiveRead => ({ state: 'ok', data: { repos: [{ repo: 'alpha', waves }] } as never });
const q = (s: string) => modeParamsOf(new URLSearchParams(s));

// The one rule both sides draw by: the server sends the replay film only when this picks it, the client draws the
// screen it picks. Before the payload is read, the address decides alone when it can; else the film is pending.
describe('pickFilm', () => {
  it('unread: ?mr= and ?live=0 are the replay, ?live=1 the live film, the bare address is pending', () => {
    const unread: LiveRead = { state: 'unread' };
    expect(pickFilm(q('mr=44'), unread)).toEqual({ kind: 'replay' });
    expect(pickFilm(q('live=0'), unread)).toEqual({ kind: 'replay' });
    expect(pickFilm(q('live=1'), unread)).toEqual({ kind: 'live' });
    expect(pickFilm(q(''), unread)).toEqual({ kind: 'pending' });
    expect(pickFilm(q('repo=alpha&wave=2'), unread)).toEqual({ kind: 'pending' });
    expect(pickFilm(q('repo=alpha&wave=2&mr=1'), unread)).toEqual({ kind: 'replay' });
  });
  it('read: a running wave is the live film, none is the replay; ?mr= wins over both', () => {
    expect(pickFilm(q(''), payload(wave(true)))).toEqual({ kind: 'live' });
    expect(pickFilm(q(''), payload(wave(false)))).toEqual({ kind: 'replay' });
    expect(pickFilm(q('mr=44'), payload(wave(true)))).toEqual({ kind: 'replay' });
    expect(pickFilm(q('live=0'), payload(wave(true)))).toEqual({ kind: 'replay' });
  });
  it('?repo=&wave= is that finished wave on the live screen, or the replay when the payload no longer holds it', () => {
    expect(pickFilm(q('repo=alpha&wave=2'), payload(wave(false)))).toEqual({ kind: 'live', focus: { repo: 'alpha', wave: 2 } });
    expect(pickFilm(q('repo=alpha&wave=9'), payload(wave(false)))).toEqual({ kind: 'replay' });
  });
  it('a payload that could not be read counts as no wave running', () => {
    expect(pickFilm(q(''), { state: 'error' })).toEqual({ kind: 'replay' });
    expect(pickFilm(q('live=1'), { state: 'error' })).toEqual({ kind: 'live' });
  });
});
