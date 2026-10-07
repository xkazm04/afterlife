import { describe, expect, it } from 'vitest';
import { nextPolled, repoll, repollMessage, resolveOne, statusLine, waitingCount } from './needs';
import { makeProject } from './testProject';

describe('waitingCount', () => {
  it('skips unwatched projects', () => {
    const list = [makeProject({ id: 'a', needsYou: 2 }), makeProject({ id: 'b', needsYou: 5, state: 'not-set-up' }), makeProject({ id: 'c', needsYou: 1, state: 'stale' })];
    expect(waitingCount(list)).toBe(3);
  });
});

describe('resolveOne', () => {
  it('lowers the count by one and stops at zero', () => {
    const p = makeProject({ id: 'a', needsYou: 1 });
    expect(resolveOne(p).needsYou).toBe(0);
    expect(resolveOne(resolveOne(p)).needsYou).toBe(0);
    expect(p.needsYou).toBe(1);
  });
});

describe('repoll', () => {
  it('resets the age of a healthy feed', () => {
    const r = repoll(makeProject({ id: 'a', feed: { ageSec: 30, ok: true } }));
    expect(r.ok).toBe(true);
    expect(r.project.feed.ageSec).toBe(0);
    expect(r.message).toBe('Re-polled a');
  });
  it('fails on a broken feed and keeps its age', () => {
    const r = repoll(makeProject({ id: 'a', state: 'stale', feed: { ageSec: 2400, ok: false, error: '401' } }));
    expect(r.ok).toBe(false);
    expect(r.project.feed.ageSec).toBe(2400);
    expect(r.message).toBe('Re-poll failed · a · 401');
  });
  it('has nothing to poll on an unwatched project', () => {
    expect(repoll(makeProject({ id: 'a', state: 'not-set-up' })).message).toBe('a: not watched, nothing to poll');
  });
  it('says re-polled only for a poll that succeeded (live: the server’s answer)', () => {
    expect(repollMessage('ledgerline', { ok: true })).toBe('Re-polled ledgerline');
    expect(repollMessage('ledgerline', { ok: false, reason: '401 Unauthorized' })).toBe('Re-poll failed · ledgerline · 401 Unauthorized');
  });
});

describe('status line', () => {
  it('reads like the prototype', () => {
    expect(statusLine(184, 184, 0, 12)).toBe('184 projects · 0 filters · polled 12 s ago');
    expect(statusLine(9, 184, 1, 3)).toBe('9 of 184 projects · 1 filter · polled 3 s ago');
  });
  it('wraps the poll counter after 59', () => {
    expect(nextPolled(12)).toBe(13);
    expect(nextPolled(59)).toBe(0);
  });
  it('in live mode only counts up: no poll is simulated in the browser', () => {
    expect(nextPolled(59, true)).toBe(60);
  });
});
