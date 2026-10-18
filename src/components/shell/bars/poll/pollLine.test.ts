// The status bar's poll line: how old the last good poll is, that it failed and why, and how many projects failed. One
// short line in three tones; only a failed poll offers Re-poll.
import { describe, expect, it } from 'vitest';
import { pollLine, recheckDue, type PollLineInput } from './pollLine';

const at = (over: Partial<PollLineInput>): PollLineInput => ({ ageSec: 12, error: null, failing: 0, of: 7, intervalSec: 30, ...over });

describe('pollLine', () => {
  it('a fresh poll is ok: its age, nothing else', () => {
    expect(pollLine(at({}))).toEqual({ tone: 'ok', text: 'polled 12s ago' });
  });

  it('older than two intervals is late, with the interval it should keep', () => {
    expect(pollLine(at({ ageSec: 95 }))).toEqual({ tone: 'late', text: 'late · polled 1m ago (every 30s)' });
    expect(pollLine(at({ ageSec: 60 }))).toEqual({ tone: 'ok', text: 'polled 1m ago' }); // exactly two intervals: not yet
  });

  it('a failed poll says why and since when it was last good, and offers Re-poll', () => {
    expect(pollLine(at({ ageSec: 300, error: 'HTTP 401 Unauthorized', failing: 7 }))).toEqual({
      tone: 'failed', text: 'last poll failed: HTTP 401 Unauthorized · last good 5m ago', repoll: true,
    });
    expect(pollLine(at({ ageSec: null, error: 'HTTP 401 Unauthorized', failing: 7 }))).toEqual({
      tone: 'failed', text: 'last poll failed: HTTP 401 Unauthorized · never polled ok', repoll: true,
    });
  });

  it('projects that failed while the group was read make it late, and are counted', () => {
    expect(pollLine(at({ failing: 2 }))).toEqual({ tone: 'late', text: 'polled 12s ago · 2 of 7 projects failed' });
  });

  it('hours and days stay short', () => {
    expect(pollLine(at({ ageSec: 7300 })).text).toBe('late · polled 2h ago (every 30s)');
    expect(pollLine(at({ ageSec: 200_000, intervalSec: 120 })).text).toBe('late · polled 2d ago (every 2m)');
  });
});

describe('recheckDue', () => {
  it('asks the server again only once the ticking age would call a healthy poll late', () => {
    expect(recheckDue(at({}), 40)).toBe(false); // 52 s
    expect(recheckDue(at({}), 49)).toBe(true); // 61 s: the page sat still, the poller probably did not
    expect(recheckDue(at({ ageSec: 95 }), 0)).toBe(false); // late as the server read it: nothing to recheck
    expect(recheckDue(at({ error: 'x', failing: 7 }), 500)).toBe(false);
  });
});
