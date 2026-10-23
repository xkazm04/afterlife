// How a commit lands in the state and how long a gate took to read it (./commit.ts).
import { describe, expect, it } from 'vitest';
import { delayText } from './commit';

describe('delayText: how long after the commit a gate read it', () => {
  it('says seconds, then minutes, then hours', () => {
    expect([45, 119, 120, 180, 3599, 7200, 36_000].map(delayText)).toEqual(['45 s', '119 s', '2 min', '3 min', '60 min', '2 h', '10 h']);
  });
  it('a value that rounds up to the next unit is said in it: never "120 min" or "48 h"', () => {
    expect(delayText(7170)).toBe('2 h');
    expect(delayText(7199)).toBe('2 h');
    expect(delayText(172_000)).toBe('2 d');
  });
  it('a gate that read it days later says days, not a pile of hours', () => {
    expect(delayText(3 * 86_400)).toBe('3 d');
  });
});
