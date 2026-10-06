import { describe, expect, it } from 'vitest';
import { START_SEC, hms, isClockTime, pollAge, toSec } from './clock';

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
});
