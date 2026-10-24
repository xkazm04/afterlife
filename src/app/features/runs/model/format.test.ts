import { describe, expect, it } from 'vitest';
import { DASH, tokens, wall } from './format';

describe('the figures at their rounding edges', () => {
  it('wall never reads 60 seconds: a rounded-up minute carries over', () => {
    expect(wall(59.6)).toBe('1m 0s');
    expect(wall(119.7)).toBe('2m 0s');
    expect(wall(3599.6)).toBe('1h 0m');
    expect(wall(59.4)).toBe('59s');
    expect(wall(75)).toBe('1m 15s');
    expect(wall(3725)).toBe('1h 2m');
    expect(wall(undefined)).toBe(DASH);
  });

  it('tokens never read 1000.0k: a count that rounds to a million says M', () => {
    expect(tokens(999_950)).toBe('1.0M');
    expect(tokens(999_949)).toBe('999.9k');
    expect(tokens(999)).toBe('999');
    expect(tokens(1234)).toBe('1.2k');
    expect(tokens(2_500_000)).toBe('2.5M');
  });
});
