import { describe, expect, it } from 'vitest';
import { ctx } from '../testCtx';
import type { Gap } from '../ctx';
import { sendLabel } from './commands';

/** The '+' lines across a gap's fixture files: the screen shows the dataset's diffLines, so the two must agree. */
const addedLines = (g: Gap): number => g.x.files.reduce((a, f) => a + f.lines.filter((l) => l.startsWith('+')).length, 0);

describe('fixtures', () => {
  it('every proposal has its screen data and the diff size the dataset states', () => {
    expect(ctx.gaps.map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    for (const g of ctx.gaps) expect(addedLines(g), g.id).toBe(g.diffLines);
  });
});

describe('sendLabel', () => {
  it('counts the MRs the button opens', () => {
    expect(sendLabel(2)).toBe('Open 2 MRs as you');
    expect(sendLabel(1)).toBe('Open 1 MR as you');
  });
});
