// The inspector's sections count and label what they draw: the beat denominator is the film's holds, not a typed 9;
// a real film's ledger clock column says it is UTC.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ledgerEvents } from '@/server/gitlab/fake/demo/ledger';
import { SEED_NOW } from '@/server/index/seed';
import { REPLAY_LEDGER } from '../../data/ledger';
import { ledgerFilm } from '../../model/film/fromLedger';
import { HOLDS } from '../../model/film/holds';
import { seqRange } from '../../model/replay/state';
import type { LedgerEntry } from '../../model/types';
import { BeatSection } from './BeatSection';
import { LedgerSection } from './LedgerSection';

const beat = (n: number, holds = HOLDS) => renderToStaticMarkup(createElement(BeatSection, { beat: n, holds }));

describe('BeatSection', () => {
  it('heads the beat with the number of holds the film has', () => {
    expect(beat(2)).toContain(`2 / ${HOLDS.length}`);
    const five = beat(2, HOLDS.slice(0, 5));
    expect(five).toContain('2 / 5');
    expect(five).not.toContain('/ 9');
  });
});

const ledger = (entries: readonly LedgerEntry[]) =>
  renderToStaticMarkup(createElement(LedgerSection, { i: 0, entries, range: seqRange({ entries, takes: [] }), onSeek: () => undefined }));

describe('LedgerSection', () => {
  it('names the zone of a real film\'s clock column (UTC) once, and leaves the illustrative slice\'s simulated clock bare', () => {
    const film = ledgerFilm(ledgerEvents(SEED_NOW))!;
    expect(ledger(film.entries)).toMatch(/seq \d+–\d+ · UTC/);
    expect(ledger(REPLAY_LEDGER)).toContain('seq 480–520<');
    expect(ledger(REPLAY_LEDGER)).not.toContain('UTC');
  });
});
