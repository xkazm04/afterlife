import { describe, expect, it } from 'vitest';
import type { Hunk } from '../types';
import { withQuote } from './buildTasks';

const hunk = (marks: (' ' | '+')[]): Hunk => ({ file: 'f', head: 'h', lines: marks.map((m, i) => [m, `line ${i}`] as const) });

describe('withQuote', () => {
  it('swaps the third line when it is the added one, dropping the quote marker', () => {
    const out = withQuote(hunk([' ', ' ', '+']), '+ quoted');
    expect(out?.lines.map((l) => l[1])).toEqual(['line 0', 'line 1', 'quoted']);
    expect(out?.lines[2]?.[0]).toBe('+');
  });
  it('swaps the first added line, never a context line at index 2', () => {
    const out = withQuote(hunk([' ', '+', ' ', '+']), 'q');
    expect(out?.lines.map((l) => l[1])).toEqual(['line 0', 'q', 'line 2', 'line 3']);
    expect(out?.lines[2]?.[0]).toBe(' ');
  });
  it('leaves a hunk with no added line untouched', () => {
    const h = hunk([' ', ' ', ' ']);
    expect(withQuote(h, 'q')).toBe(h);
  });
});
