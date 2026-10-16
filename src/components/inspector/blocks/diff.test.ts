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

  it('drops the two-character mark-and-space prefix of every line, so a producer must always emit it', () => {
    // Every producer (arm plans, plans/cra, enroll) emits "+ x" / "- y" / "  z". A bare line would lose its first two characters.
    expect(parseDiff(['context', ''])).toEqual([
      [' ', 'ntext'],
      [' ', ''],
    ]);
  });

  it('reads a "@@" hunk header as context: the prefix slice leaves " file · lines" after the marker', () => {
    expect(parseDiff(['@@ ci.yml · after line 4', '+ a'])).toEqual([
      [' ', ' ci.yml · after line 4'],
      ['+', 'a'],
    ]);
  });
});
