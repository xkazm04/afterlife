import { describe, expect, it } from 'vitest';
import { PROPOSAL_EXTRAS } from '@/app/features/maturity/data/proposals';
import { GAP_DETAIL } from '../gaps';

/** The action classes a line names ("ci-config.change"). */
const classesIn = (line: string): string[] => line.match(/\b[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*\b/g) ?? [];

describe('GAP_DETAIL.does is true of every gap page it is drawn on', () => {
  it.each(Object.entries(PROPOSAL_EXTRAS))('%s: each class a line names is the gap’s own, or the line says the probe is not it', (_id, extra) => {
    for (const line of GAP_DETAIL.does) {
      for (const cls of classesIn(line)) {
        if (cls !== extra.cls) expect(line).toMatch(/probe/);
      }
    }
  });
});
