// The loader keeps the two films apart from live data. The illustrative film reads its quote, rungs, stages, tracks and
// holds from the catalogue (DEMO) only, in every mode: against a real group's index (no '!44' task, no ledger, no
// maturity scan) it is the same film as in demo. The real film reads nothing from the catalogue.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { setDataSource } from '@/server/data';
import { fakeGroupLive } from '@/server/data/__tests__/fakeGroup';
import { demoSource } from '@/server/data/demoSource';
import { replayClock } from '@/server/data/live/clock';
import { liveSource } from '@/server/data/live/liveSource';
import { buildSnapshot } from '@/server/data/live/snapshot';
import type { DataSource } from '@/server/data/types';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { BeatInspector } from '../components/inspector/BeatInspector';
import { Cap } from '../components/wall/Cap';
import { buildSnapshots } from '../model/derive/snapshots';
import type { Film } from '../model/types';
import { REPLAY_LEDGER } from './ledger';
import { loadTheaterData } from './loadTheaterData';

let bare: DataSource;
let fake: DataSource;
beforeAll(async () => {
  const snap = await buildSnapshot(await memoryIndex(), replayClock.read(), 'ledgerline', DEMO);
  bare = liveSource(() => snap);
  ({ live: fake } = await fakeGroupLive());
}, 60_000);
afterEach(() => setDataSource(null));

const load = (ds: DataSource) => {
  setDataSource(ds);
  return JSON.parse(JSON.stringify(loadTheaterData())) as ReturnType<typeof loadTheaterData>;
};

describe('loadTheaterData', () => {
  it('live, against an index with no !44 task and no ledger: the illustrative film, the catalogue\'s quote, as in demo', () => {
    expect(bare.getTasks().some((t) => t.mr === '!44')).toBe(false);
    expect(bare.getLedger()).toEqual([]);
    const l = load(bare);
    expect(l.film.source).toBe('illustrative');
    expect(l.demo?.quote).toBe(DEMO.tasks.find((t) => t.mr === '!44')?.quote);
    expect(l.demo?.quote).not.toBe('');
    expect(l.demo?.rungs).toEqual(DEMO.maturity.rungs);
    expect(l).toEqual(load(demoSource));
  });

  it('live, with the fake group\'s ledger: the real film, and nothing from the catalogue', () => {
    const l = load(fake);
    expect(l.film.source).toBe('belay-ledger');
    expect(l.demo).toBeNull();
    expect(l.film.takes.map((t) => t.mr)).toEqual([41, 44]);
    const text = JSON.stringify(l);
    for (const s of [...DEMO.loop.map((h) => h.text), DEMO.tasks.find((t) => t.mr === '!44')?.quote ?? '?']) expect(text).not.toContain(s);
  });
});

describe('a missing quote never renders an empty "quoted from !44 · untrusted" box', () => {
  const e = REPLAY_LEDGER.find((x) => x.quote)!;
  it('the caption', () => {
    expect(renderToString(createElement(Cap, { e, y: 0, cut: true, quote: '' }))).not.toContain('untrusted');
    expect(renderToString(createElement(Cap, { e, y: 0, cut: true, quote: 'q' }))).toContain('quoted from !44 · untrusted');
  });

  it('the inspector', () => {
    setDataSource(demoSource);
    const { film, demo } = loadTheaterData();
    const snap = buildSnapshots(film.entries, demo!.stages).find((s) => s.e === e)!;
    const html = (quote: string) => renderToString(createElement(BeatInspector, { snap, film: film as Film, demo: { ...demo!, quote }, onSeek: () => undefined }));
    expect(html('')).not.toContain('untrusted');
    expect(html('q')).toContain('Quoted from !44 · untrusted');
  });
});
