import { describe, expect, it } from 'vitest';
import { clockParts, clockText, elapsedPercent, railTicks, secondsLeft } from './clock';

describe('legal clock arithmetic', () => {
  it('counts down from the remaining seconds and never goes below zero', () => {
    expect(secondsLeft(100, 30)).toBe(70);
    expect(secondsLeft(100, 100)).toBe(0);
    expect(secondsLeft(100, 5000)).toBe(0);
  });
  it('ignores a negative elapsed time (a clock that jumped back never adds time)', () => {
    expect(secondsLeft(100, -50)).toBe(100);
  });
  it('splits into two-digit hours, minutes and seconds, hours past 24 included', () => {
    expect(clockParts(19 * 3600 + 11 * 60 + 59)).toEqual({ h: '19', m: '11', s: '59' });
    expect(clockText(19 * 3600 + 12 * 60)).toBe('19:12:00');
    expect(clockText(49 * 3600 + 5)).toBe('49:00:05');
    expect(clockText(-3)).toBe('00:00:00');
  });
  it('reports how much of the 24 h window has passed, clamped to 0..100', () => {
    const day = 24 * 3600;
    expect(elapsedPercent(day, 19 * 3600 + 12 * 60)).toBe(20);
    expect(elapsedPercent(day, day)).toBe(0);
    expect(elapsedPercent(day, 0)).toBe(100);
    expect(elapsedPercent(day, day + 10)).toBe(0);
    expect(elapsedPercent(0, 0)).toBe(100);
  });
  it('labels the rail: aware at the start, +6/12/18 h, due at the end', () => {
    const ticks = railTicks(24 * 3600, '09:10', '09:10');
    expect(ticks.map((t) => t.label)).toEqual(['aware 09:10', '+6 h', '+12 h', '+18 h', 'due 09:10']);
    expect(ticks.map((t) => t.pct)).toEqual([0, 25, 50, 75, 100]);
    expect(ticks.map((t) => t.kind)).toEqual(['start', 'mid', 'center', 'mid', 'end']);
  });
  it('drops ticks that fall past a shorter window', () => {
    expect(railTicks(10 * 3600, 'a', 'b').map((t) => t.label)).toEqual(['aware a', '+6 h', 'due b']);
  });
});
