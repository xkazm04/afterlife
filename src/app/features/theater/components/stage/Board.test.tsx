// The closing Board on the illustrative film's last entry, against the catalogue the loader hands it: a stage the
// catalogue has no day-0 reading for (monitor) is said in words, never as a bare "?" on the film.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { REPLAY_LEDGER } from '../../data/ledger';
import { buildSnapshots } from '../../model/derive/snapshots';
import type { TheaterDemo } from '../../model/types';
import { Board } from './Board';

const demo: TheaterDemo = {
  stages: DEMO.stages,
  tracksArmed: 0,
  tracksTotal: 0,
  rungNames: DEMO.maturity.rungNames,
  rungs: DEMO.maturity.rungs,
  quote: '',
};
const last = buildSnapshots(REPLAY_LEDGER, []).at(-1)!;
const html = (d: TheaterDemo) => renderToStaticMarkup(createElement(Board, { snap: last, demo: d, last: true }));

describe('Board, the closing wall', () => {
  it('says a missing day-0 reading in words, with no placeholder "?"', () => {
    const unread = { ...demo, rungs: demo.rungs.map((r) => (r.stage === 'monitor' ? { ...r, day0: null } : r)) };
    const out = html(unread);
    expect(out).toContain('no day-0 reading');
    expect(out).not.toContain('day 0 ?');
  });
  it('adds nothing when every stage has its day-0 reading', () => {
    const read = { ...demo, rungs: demo.rungs.map((r) => ({ ...r, day0: r.day0 ?? 0 })) };
    expect(html(read)).not.toContain('day-0');
  });
});
