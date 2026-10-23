import { describe, expect, it } from 'vitest';
import { readInstant } from './readInstant';

const iso = (s: string) => new Date(readInstant(s)).toISOString();

describe('readInstant', () => {
  it('reads a zone-less date-time as UTC, whatever the host zone (T or space, with or without seconds)', () => {
    expect(iso('2026-10-06T10:00')).toBe('2026-10-06T10:00:00.000Z');
    expect(iso('2026-10-06T10:00:30')).toBe('2026-10-06T10:00:30.000Z');
    expect(iso('2026-10-06 10:00')).toBe('2026-10-06T10:00:00.000Z');
  });
  it('keeps a date-only value and an explicit zone as written', () => {
    expect(iso('2026-10-06')).toBe('2026-10-06T00:00:00.000Z');
    expect(iso('2026-10-06T10:00:00Z')).toBe('2026-10-06T10:00:00.000Z');
    expect(iso('2026-10-06T10:00:00+02:00')).toBe('2026-10-06T08:00:00.000Z');
  });
  it('is NaN for text that is no instant', () => {
    expect(readInstant('soon')).toBeNaN();
    expect(readInstant('')).toBeNaN();
  });
});
