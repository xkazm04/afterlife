// The transport's tooltips name what the keys and the reducer actually do: the cue keys the key map binds
// (1..MAX_TAKES), and the pre-roll the reducer arms (PREROLL_MS, or PREROLL_REDUCED_MS under reduced motion).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import { Transport } from './Transport';

vi.mock('../../model/film/fromLedger', async (orig) => ({ ...(await orig<typeof import('../../model/film/fromLedger')>()), MAX_TAKES: 2 }));

const actions = {} as TheaterActions;
const html = (reduced: boolean): string =>
  renderToStaticMarkup(createElement(Transport, { playing: false, loop: false, readout: { text: 'Held', live: false }, actions, onPresent: () => undefined, reduced }));

describe('Transport tooltips follow the key map and the reducer', () => {
  it('Present names the cue keys MAX_TAKES binds, not a hand-written 1–8', () => {
    expect(html(false)).toContain('Present: hides all chrome; 1–2, R, L');
    expect(html(false)).not.toContain('1–8');
  });
  it('Roll names the pre-roll the reducer arms: 2 s, or 1 s under reduced motion', () => {
    expect(html(false)).toContain('2 s pre-roll');
    expect(html(true)).toContain('1 s pre-roll');
    expect(html(true)).not.toContain('2 s pre-roll');
  });
});
