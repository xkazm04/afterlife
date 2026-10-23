// The transport's tooltips name what the keys and the reducer actually do: the cue keys the key map binds
// (1..MAX_TAKES), and the pre-roll the reducer arms (PREROLL_MS, or PREROLL_REDUCED_MS under reduced motion).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import type { Film, Take } from '../../model/types';
import { TheaterHelp } from './TheaterHelp';
import { Transport } from './Transport';

vi.mock('../../model/film/fromLedger', async (orig) => ({ ...(await orig<typeof import('../../model/film/fromLedger')>()), MAX_TAKES: 2 }));

const actions = {} as TheaterActions;
const html = (reduced: boolean): string =>
  renderToStaticMarkup(createElement(Transport, { playing: false, loop: false, readout: { text: 'Held', live: false }, actions, onPresent: () => undefined, reduced }));

const film = (n: number): Film => ({ source: 'belay-ledger', entries: [], holds: [], takes: Array.from({ length: n }, (_, i): Take => ({ name: `T${i}`, a: i, b: i + 1 })) });
const help = (n: number): string => renderToStaticMarkup(createElement(TheaterHelp, { film: film(n) }));
const present = (takes: number): string =>
  renderToStaticMarkup(createElement(Transport, { playing: false, loop: false, readout: { text: 'Held', live: false }, actions, onPresent: () => undefined, takes }));

describe('the legend and the Present tooltip name only the cue keys the film binds', () => {
  it('a 3-take film stops at MAX_TAKES (2 here), a 1-take film reads 1, a 2-take film 1–2', () => {
    expect(help(3)).toContain('>1–2<');
    expect(help(1)).toContain('>1<');
    expect(help(1)).not.toContain('1–');
  });
  it('the Present tooltip says the same count', () => {
    expect(present(1)).toContain('Present: hides all chrome; 1, R');
    expect(present(5)).toContain('Present: hides all chrome; 1–2, R');
  });
});

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

describe('the readout live region', () => {
  it('speaks the words only: the glyph is drawn aria-hidden', () => {
    const out = renderToStaticMarkup(
      createElement(Transport, { playing: true, loop: false, readout: { text: '● Rolling', glyph: '●', words: 'Rolling', live: true }, actions, onPresent: () => undefined, reduced: false }),
    );
    const live = out.match(/<span[^>]*aria-live="polite"[^>]*>(.*?)<\/span><\/div>|<span[^>]*aria-live="polite"[^>]*>(.*)$/s)?.[0] ?? '';
    const spoken = live.replace(/<span aria-hidden="true">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '');
    expect(live).toContain('●');
    expect(spoken).not.toContain('●');
    expect(spoken).toContain('Rolling');
  });
});
