import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TIER_WHY } from '../../data/constants';
import { REPLAY_LEDGER } from '../../data/ledger';
import { buildSnapshots, EMPTY } from '../../model/derive/snapshots';
import { Autonomy } from './Autonomy';

const snaps = buildSnapshots(REPLAY_LEDGER, []);
const at = (seq: number) => snaps.find((s) => s.e.seq === seq)!;

/** The row tooltip of each action class, in the order the rows are drawn. */
function whys(seq: number): string[] {
  const html = renderToStaticMarkup(createElement(Autonomy, { snap: at(seq), fromLedger: false }));
  return [...html.matchAll(/ title="([^"]*)"/g)].map((m) => m[1]!);
}

describe('Autonomy row tooltips say why a class sits at its tier', () => {
  it('at the start: hands-off acts alone, assisted only proposes, supervised needs a person', () => {
    expect(whys(480)).toEqual([TIER_WHY.hands_off, TIER_WHY.assisted, TIER_WHY.other]);
  });
  it('after the promotion at seq 503, qa.file-bug reads as earned', () => {
    expect(whys(503)).toEqual([TIER_WHY.hands_off, TIER_WHY.bug, TIER_WHY.other]);
  });
  it('after the demotion at seq 510, patch-bump reads as quarantined', () => {
    expect(whys(520)).toEqual([TIER_WHY.hands_off, TIER_WHY.bug, TIER_WHY.quarantined]);
  });
  it('a real film says the tier is the ledger event\'s own, for every class its events name', () => {
    const snap = { ...at(480), tiers: { 'dep-bump.patch': 'hands_off', 'x.y': 'supervised' } as typeof EMPTY.tiers };
    const html = renderToStaticMarkup(createElement(Autonomy, { snap, fromLedger: true }));
    const titles = [...html.matchAll(/ title="([^"]*)"/g)].map((m) => m[1]);
    expect(titles).toEqual(['The tier at the time, as the ledger event states it', 'The tier at the time, as the ledger event states it']);
  });
});
