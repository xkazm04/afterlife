// What the Theater route needs, read through the data source on the server. The film is the deep project's own
// belay-ledger when it names an MR (mapped here, on the server: @/schemas/ledger imports node:crypto); else the
// illustrative slice.
import { getDataSource } from '@/server/data';
import { ledgerFilm } from '../model/film/fromLedger';
import type { TheaterData } from '../model/types';
import { TAKES } from './constants';
import { REPLAY_LEDGER } from './ledger';

export function loadTheaterData(): TheaterData {
  const ds = getDataSource();
  const real = ledgerFilm(ds.getLedger());
  if (real) return { film: real, demo: null, subtitle: `${ds.getPortfolio().group} / ${ds.deepProjectId()}` };
  const tracks = ds.getTracks();
  const maturity = ds.getMaturity();
  return {
    film: { source: 'illustrative', entries: REPLAY_LEDGER, takes: TAKES, holds: ds.getLoop() },
    demo: {
      stages: ds.getStages(),
      tracksArmed: tracks.filter((t) => t.armed).length,
      tracksTotal: tracks.length,
      rungNames: maturity.rungNames,
      rungs: maturity.rungs,
      // the untrusted line quoted from the seeded !44 (task 01J8Q9)
      quote: ds.getTasks().find((t) => t.mr === '!44')?.quote ?? '',
    },
    subtitle: 'acme-lab / ledgerline',
  };
}
