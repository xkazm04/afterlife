import { describe, expect, it } from 'vitest';
import { nextPolled, repoll, repollMessage, statusLine } from './needs';
import { makeProject } from './testProject';

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
  it('never ends the failure line on an empty reason (a stored error of "")', () => {
    expect(repoll(makeProject({ id: 'a', state: 'stale', feed: { ageSec: 60, ok: false, error: '' } })).message).toBe('Re-poll failed · a · no answer');
    expect(repollMessage('a', { ok: false, reason: '' })).toBe('Re-poll failed · a · no answer'); // live: an Error('') from the action
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
    expect(statusLine(1, 1, 0, 0)).toBe('1 project · 0 filters · polled 0 s ago');
    expect(statusLine(9, 184, 1, 3)).toBe('9 of 184 projects · 1 filter · polled 3 s ago');
  });
  it('writes a live snapshot age past a minute in the feed units, never "polled 7200 s ago"', () => {
    expect(statusLine(184, 184, 0, 90)).toBe('184 projects · 0 filters · polled 2 m ago');
    expect(statusLine(184, 184, 0, 7200)).toBe('184 projects · 0 filters · polled 2 h ago');
  });
  it('wraps the poll counter after 59', () => {
    expect(nextPolled(12)).toBe(13);
    expect(nextPolled(59)).toBe(0);
  });
  it('in live mode only counts up: no poll is simulated in the browser', () => {
    expect(nextPolled(59, true)).toBe(60);
  });
});
