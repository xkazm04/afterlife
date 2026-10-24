import { describe, expect, it } from 'vitest';
import { hms, livePollAge, wallTime } from './time';

describe('clock words', () => {
  it('seconds since midnight to HH:MM:SS, wrapping at a day', () => {
    expect(hms(14 * 3600 + 24 * 60 + 12)).toBe('14:24:12');
    expect(hms(86399)).toBe('23:59:59');
    expect(hms(86400)).toBe('00:00:00');
  });
  it('live: the poll age counts up from the snapshot’s and never wraps; the page clock reads the wall clock', () => {
    expect([livePollAge(0, 12), livePollAge(3, 12), livePollAge(600, 12), livePollAge(-5, -1)]).toEqual([12, 15, 612, 0]);
    expect(wallTime(new Date(2026, 9, 7, 9, 5, 7))).toBe('09:05:07');
  });
});
