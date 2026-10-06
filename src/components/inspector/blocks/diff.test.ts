import { describe, expect, it } from 'vitest';
import { parseDiff } from './diff';

describe('parseDiff', () => {
  it('splits the mark from the text and keeps the indentation after the mark and its space', () => {
    expect(parseDiff(['  T1.fix:', '-   tier: assisted', '+   tier: supervised'])).toEqual([
      [' ', 'T1.fix:'],
      ['-', '  tier: assisted'],
      ['+', '  tier: supervised'],
    ]);
  });

  it('treats anything without a + or - as context', () => {
    expect(parseDiff(['context', ''])).toEqual([
      [' ', 'ntext'],
      [' ', ''],
    ]);
  });
});
