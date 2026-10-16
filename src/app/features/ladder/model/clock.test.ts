import { describe, expect, it } from 'vitest';
import { START_SEC, clockLabel, clockTime, demoInstant, hms, isClockTime, livePollAge, pollAge, wallTime } from './clock';

describe('clock', () => {
  it('formats the demo start', () => {
    expect(hms(START_SEC)).toBe('14:24:12');
    expect(hms(86399)).toBe('23:59:59');
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
  it('live: the poll age counts up from the snapshot’s and never wraps; the page clock reads the wall clock', () => {
    expect([livePollAge(0, 12), livePollAge(3, 12), livePollAge(600, 12)]).toEqual([12, 15, 612]);
    expect(wallTime(new Date(2026, 9, 7, 9, 5, 7))).toBe('09:05:07');
  });
});

describe('clockLabel: one instant, one zone, one label', () => {
  const now = new Date('2026-10-15T10:00:00Z');
  it('older than a day: "N d ago"', () => {
    expect(clockLabel(Date.parse('2026-10-12T09:00:00Z'), 'UTC', now)).toBe('3 d ago');
  });
  it('within a day: the HH:MM:SS of that instant in the zone named, whatever the process zone', () => {
    expect(clockLabel(now.getTime() - 30_000, 'UTC', now)).toBe('09:59:30');
    expect(clockLabel(now.getTime() - 30_000, 'Europe/Prague', now)).toBe('11:59:30');
    expect(clockTime(Date.parse('2026-10-15T23:59:59Z'), 'UTC')).toBe('23:59:59');
    expect(clockTime(Date.parse('2026-10-16T00:00:01Z'), 'UTC')).toBe('00:00:01');
  });
  it('the demo clock is DEMO_NOW’s day from 14:24:12 UTC', () => {
    expect(new Date(demoInstant(0)).toISOString()).toBe('2026-10-06T14:24:12.000Z');
    expect(clockTime(demoInstant(18), 'UTC')).toBe('14:24:30');
  });
});
