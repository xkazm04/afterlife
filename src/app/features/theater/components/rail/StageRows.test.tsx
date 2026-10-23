// "n / 9" and "beat n of 9" are counts of the catalogue's stages and the film's holds; the denominators read those
// lists, so a catalogue or a loop of another length is never drawn against a hand-written nine.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { TAKES } from '../../data/constants';
import { REPLAY_LEDGER } from '../../data/ledger';
import { buildSnapshots } from '../../model/derive/snapshots';
import { HOLDS } from '../../model/film/holds';
import { initialState } from '../../model/replay/state';
import { createReplayStore } from '../../model/replay/store';
import type { Film, TheaterDemo } from '../../model/types';
import { Board } from '../stage/Board';
import { Pitch } from '../stage/Pitch';
import { StageRows } from './StageRows';

const stages = DEMO.stages.slice(0, 3);
const demo: TheaterDemo = { stages, tracksArmed: 0, tracksTotal: 0, rungNames: DEMO.maturity.rungNames, rungs: DEMO.maturity.rungs, quote: '' };
const snaps = buildSnapshots(REPLAY_LEDGER, stages);
const text = (el: ReturnType<typeof createElement>): string => renderToStaticMarkup(el).replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '');

describe('the stage and beat denominators count their lists', () => {
  it('Stages with evidence reads n / the catalogue\'s stages', () => {
    expect(text(createElement(StageRows, { snap: snaps.at(-1)!, demo }))).toMatch(/\d \/ 3/);
  });
  it('the closing Board reads n / the catalogue\'s stages', () => {
    expect(text(createElement(Board, { snap: snaps.at(-1)!, demo, last: true }))).toMatch(/\d\/ 3 stages with evidence/);
  });
  it('the beat line reads beat n of the film\'s holds', () => {
    const film: Film = { source: 'illustrative', entries: REPLAY_LEDGER, takes: TAKES, holds: HOLDS.slice(0, 5) };
    const snap = snaps.find((s) => s.beat === 2)!;
    const store = createReplayStore(initialState(film));
    const out = text(createElement(Pitch, { snap, snaps, store, film, demo: null }));
    expect(out).toContain('beat 2 of 5');
    expect(out).not.toContain('of 9');
  });
});
