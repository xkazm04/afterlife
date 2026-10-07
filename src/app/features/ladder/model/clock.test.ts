import { describe, expect, it } from 'vitest';
import { START_SEC, hms, isClockTime, livePollAge, pollAge, toSec, wallTime } from './clock';

describe('clock', () => {
  it('formats and parses the demo start', () => {
    expect(hms(START_SEC)).toBe('14:24:12');
    expect(toSec('14:24:12')).toBe(START_SEC);
    expect(toSec(hms(86399))).toBe(86399);
  });
  it('tells clock times from relative ones', () => {
    expect(isClockTime('14:20:03')).toBe(true);
    expect(isClockTime('11 d ago')).toBe(false);
  });
  it('ages the poll and resets it every 15 s', () => {
    expect(pollAge(0, 12)).toBe(12);
    expect(pollAge(2, 12)).toBe(14);
    expect(pollAge(3, 12)).toBe(0);
    expect(pollAge(18, 12)).toBe(0);
  });
  it('live: the poll age counts up from the snapshot’s and never wraps; entries take the wall clock', () => {
    expect([livePollAge(0, 12), livePollAge(3, 12), livePollAge(600, 12)]).toEqual([12, 15, 612]);
    expect(wallTime(new Date(2026, 9, 7, 9, 5, 7))).toBe('09:05:07');
  });
});
