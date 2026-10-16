// The real film's nine holds are a hand copy of the catalogue's loop (label and stage; the narrative is left out on purpose).
// Nothing else ties the two lists, so a rename or a re-staging on one side would show two different loops for one wall.
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { HOLDS } from './holds';

describe('the real film\'s holds', () => {
  it('are the catalogue loop\'s nine holds: same number, label and stage, in order', () => {
    expect(HOLDS.map((h) => [h.n, h.label, h.stage])).toEqual(DEMO.loop.map((h) => [h.n, h.label, h.stage]));
  });

  it('tell no story: a real film carries no who or text', () => {
    for (const h of HOLDS) expect(h).not.toHaveProperty('who');
    for (const h of HOLDS) expect(h).not.toHaveProperty('text');
  });
});
