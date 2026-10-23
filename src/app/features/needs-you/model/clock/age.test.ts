// A dense row's age never reads "0d" and an unknown start is null, never zero; the stamp is UTC.
import { describe, expect, it } from 'vitest';
import { shortAge, utcStamp } from './age';

const now = new Date('2026-10-23T12:00:00Z');

describe('shortAge', () => {
  it('rounds down to the largest whole unit', () => {
    expect(shortAge('2026-10-21T11:00:00Z', now)).toBe('2d');
    expect(shortAge('2026-10-23T07:30:00Z', now)).toBe('4h');
    expect(shortAge('2026-10-23T11:20:00Z', now)).toBe('40m');
  });
  it('says under a minute, never 0, also for a clock ahead of now', () => {
    expect(shortAge('2026-10-23T11:59:50Z', now)).toBe('<1m');
    expect(shortAge('2026-10-23T12:05:00Z', now)).toBe('<1m');
  });
  it('is null for no time or one that does not parse', () => {
    expect(shortAge(null, now)).toBeNull();
    expect(shortAge('not a date', now)).toBeNull();
  });
});

describe('utcStamp', () => {
  it('reads to the minute, in UTC', () => {
    expect(utcStamp('2026-10-21T14:03:59+02:00')).toBe('2026-10-21 12:03 UTC');
    expect(utcStamp(null)).toBeNull();
  });
});
