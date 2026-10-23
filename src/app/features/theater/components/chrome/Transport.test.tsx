// The transport's tooltips name what the keys actually do: the cue keys the key map binds (1..MAX_TAKES).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import { Transport } from './Transport';

vi.mock('../../model/film/fromLedger', async (orig) => ({ ...(await orig<typeof import('../../model/film/fromLedger')>()), MAX_TAKES: 2 }));

const actions = {} as TheaterActions;
const html = (): string =>
  renderToStaticMarkup(createElement(Transport, { playing: false, loop: false, readout: { text: 'Held', live: false }, actions, onPresent: () => undefined }));

describe('Transport tooltips follow the key map', () => {
  it('Present names the cue keys MAX_TAKES binds, not a hand-written 1–8', () => {
    expect(html()).toContain('Present: hides all chrome; 1–2, R, L');
    expect(html()).not.toContain('1–8');
  });
});
