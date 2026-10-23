// The inspector's sections count and label what they draw: the beat denominator is the film's holds, not a typed 9.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HOLDS } from '../../model/film/holds';
import { BeatSection } from './BeatSection';

const beat = (n: number, holds = HOLDS) => renderToStaticMarkup(createElement(BeatSection, { beat: n, holds }));

describe('BeatSection', () => {
  it('heads the beat with the number of holds the film has', () => {
    expect(beat(2)).toContain(`2 / ${HOLDS.length}`);
    const five = beat(2, HOLDS.slice(0, 5));
    expect(five).toContain('2 / 5');
    expect(five).not.toContain('/ 9');
  });
});
