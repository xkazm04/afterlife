import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PREROLL_MS, PREROLL_REDUCED_MS, prerollLeft } from '../../model/replay/state';
import { PrerollCue } from './PrerollCue';

const cue = (left: number) => renderToStaticMarkup(createElement(PrerollCue, { left }));

describe('PrerollCue', () => {
  it('draws nothing in normal playback or once the take rolls', () => {
    expect(cue(0)).toBe('');
    expect(cue(prerollLeft({ preroll: 0 }))).toBe('');
  });
  it('counts 2 then 1 for the normal pre-roll, and only 1 for the reduced-motion one', () => {
    expect(cue(prerollLeft({ preroll: PREROLL_MS }))).toContain('Rolling in 2…');
    expect(cue(prerollLeft({ preroll: PREROLL_MS - 1001 }))).toContain('Rolling in 1…');
    expect(cue(prerollLeft({ preroll: PREROLL_REDUCED_MS }))).toContain('Rolling in 1…');
    expect(cue(prerollLeft({ preroll: PREROLL_MS }))).not.toContain('aria-live');
  });
});
