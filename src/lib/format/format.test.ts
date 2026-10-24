import { describe, expect, it } from 'vitest';
import { formatAge, formatClock, pad2, splitDuration } from './time';
import { plural, pluralWord } from './plural';
import { messageOf } from './error';

describe('formatAge', () => {
  it('matches the Fleet prototype', () => {
    expect(formatAge(null)).toBe('—');
    expect(formatAge(undefined)).toBe('—');
    expect(formatAge(0)).toBe('0 s');
    expect(formatAge(12)).toBe('12 s');
    expect(formatAge(59)).toBe('59 s');
    expect(formatAge(2400)).toBe('40 m');
    expect(formatAge(5400)).toBe('1.5 h');
  });
  it('a figure that rounds up to the next unit reads in that unit, never as 60 s, 60 m or 24 h', () => {
    expect([formatAge(59.6), formatAge(3599), formatAge(3570), formatAge(86399), formatAge(86220)]).toEqual(['1 m', '1 h', '1 h', '1 d', '1 d']);
    expect([formatAge(59.4), formatAge(3569), formatAge(86219)]).toEqual(['59 s', '59 m', '23.9 h']);
  });
  it('switches to days after 24 hours', () => {
    expect(formatAge(86400)).toBe('1 d');
    expect(formatAge(2 * 86400 + 4320)).toBe('2.1 d');
  });
});

describe('durations', () => {
  it('splits seconds', () => {
    expect(splitDuration(2 * 86400 + 3 * 3600 + 4 * 60 + 5)).toEqual({ d: 2, h: 3, m: 4, s: 5 });
    expect(splitDuration(-5)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
  });
  it('formats a clock that may pass 24 hours', () => {
    expect(formatClock(19 * 3600 + 11 * 60 + 59)).toBe('19:11:59');
    expect(formatClock(49 * 3600 + 5)).toBe('49:00:05');
    expect(formatClock(-1)).toBe('00:00:00');
    expect(pad2(7)).toBe('07');
  });
});

describe('plural', () => {
  it('chooses the right form', () => {
    expect(plural(1, 'decision')).toBe('1 decision');
    expect(plural(0, 'decision')).toBe('0 decisions');
    expect(plural(3, 'gap')).toBe('3 gaps');
    expect(plural(2, 'query', 'queries')).toBe('2 queries');
    expect(pluralWord(1, 'filter')).toBe('filter');
    expect(pluralWord(2, 'filter')).toBe('filters');
  });
});

describe('messageOf', () => {
  it('reads an Error by its message and anything else as a string', () => {
    expect(messageOf(new Error('boom'))).toBe('boom');
    expect(messageOf('plain')).toBe('plain');
    expect(messageOf(42)).toBe('42');
  });
  it('keeps only the first line when asked (a YAML code frame stays out of a one-line issue)', () => {
    expect(messageOf(new Error('bad map\n  1 | a: [\n    ^'), { firstLine: true })).toBe('bad map');
    expect(messageOf(new Error('one\ntwo'))).toBe('one\ntwo');
  });
});
