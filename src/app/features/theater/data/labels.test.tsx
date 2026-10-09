// The REPLAY chip says what the film is, in the window and in present: the invented slice is "illustrative" (never
// "recorded"); a real film names its source, belay-ledger, the MR and the seq range.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STAGES } from '@/schemas/stages';
import { ledgerEvents } from '@/server/gitlab/fake/demo/ledger';
import { SEED_NOW } from '@/server/index/seed';
import { TheaterHelp } from '../components/chrome/TheaterHelp';
import { Stage } from '../components/stage/Stage';
import { filmSnapshots } from '../model/derive/snapshots';
import { ledgerFilm } from '../model/film/fromLedger';
import { initialState } from '../model/replay/state';
import { createReplayStore } from '../model/replay/store';
import type { Film, TheaterData } from '../model/types';
import { demoSource } from '@/server/data/demoSource';
import { setDataSource } from '@/server/data';
import { loadTheaterData } from './loadTheaterData';

/** The text a viewer reads: tags and React's text separators dropped. */
const textOf = (html: string): string => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

function stageText({ film, demo }: Pick<TheaterData, 'film' | 'demo'>, present: boolean): string {
  const snaps = filmSnapshots(film, demo?.stages ?? STAGES);
  const store = createReplayStore(initialState(film));
  return textOf(renderToString(createElement(Stage, { snaps, snap: snaps[0]!, store, film, demo, present })));
}

const illustrative = (): Pick<TheaterData, 'film' | 'demo'> => {
  setDataSource(demoSource);
  const d = loadTheaterData();
  setDataSource(null);
  return d;
};
const real = (): Pick<TheaterData, 'film' | 'demo'> => ({ film: ledgerFilm(ledgerEvents(SEED_NOW)) as Film, demo: null });

describe('the REPLAY chip', () => {
  it.each([false, true])('the illustrative film says "illustrative" (present: %s), never "recorded"', (present) => {
    const t = stageText(illustrative(), present);
    expect(t).toContain('Replay · seq 480–520 · illustrative');
    expect(t).not.toMatch(/recorded/i);
  });

  it.each([false, true])('a real film names belay-ledger, the MR and its seq range (present: %s)', (present) => {
    const t = stageText(real(), present);
    expect(t).toContain('Replay · belay-ledger · !41 · seq 1–5');
    expect(t).not.toContain('illustrative');
  });

  it('the chip\'s tooltip says what the slice is', () => {
    const html = renderToString(createElement(Stage, { ...illustrative(), snaps: filmSnapshots(illustrative().film, STAGES), snap: filmSnapshots(illustrative().film, STAGES)[0]!, store: createReplayStore(), present: false }));
    expect(html).toContain('title="An illustrative ledger slice, invented for the demo: not a recorded run, not live"');
  });
});

describe('the "?" legend', () => {
  it('calls the invented slice illustrative, and a real film belay-ledger', () => {
    const ill = textOf(renderToString(createElement(TheaterHelp, { film: illustrative().film })));
    expect(ill).toContain('Illustrative ledger slice');
    expect(ill).not.toMatch(/recorded/i);
    const led = textOf(renderToString(createElement(TheaterHelp, { film: real().film })));
    expect(led).toContain('Replay · belay-ledger · seq 1–7');
    expect(led).toContain('Read from belay-ledger');
  });
});
