// What the Theater route needs, on the server. Two films, kept apart from each other and from live data:
// - the real film: the deep project's own belay-ledger, read through the data source when it names an MR (mapped
//   here, on the server: @/schemas/ledger imports node:crypto). It takes nothing from the catalogue.
// - the illustrative film: the invented slice and the parts it plays against (quote, rungs, stages, tracks, holds),
//   read from the catalogue (DEMO) only, in every mode, so live mode never splices a real MR or scan into it.
import { DEMO } from '@/lib/demo';
import { getDataSource } from '@/server/data';
import { firstParam } from '@/lib/url/searchParams';
import { ledgerFilm } from '../model/film/fromLedger';
import type { TheaterData } from '../model/types';
import { TAKES } from './constants';
import { REPLAY_LEDGER } from './ledger';

/** The illustrative film, the same in every mode. */
function illustrative(): TheaterData {
  return {
    film: { source: 'illustrative', entries: REPLAY_LEDGER, takes: TAKES, holds: DEMO.loop },
    demo: {
      stages: DEMO.stages,
      tracksArmed: DEMO.tracks.filter((t) => t.armed).length,
      tracksTotal: DEMO.tracks.length,
      rungNames: DEMO.maturity.rungNames,
      rungs: DEMO.maturity.rungs,
      // the untrusted line quoted from the seeded !44 (task 01J8Q9)
      quote: DEMO.tasks.find((t) => t.mr === '!44')?.quote ?? '',
    },
    subtitle: `${DEMO.portfolio.group} / ${DEMO.setup.project}`,
  };
}

/** The page's search params the loader reads: `mr`, the MR to film first. */
export interface TheaterParams {
  mr?: string | string[];
  /** `1` asks for the live film, `0` for the replay (live/model/mode.ts decides; the loader ignores it). */
  live?: string | string[];
  /** `repo` and `wave` name one finished wave for the live screen (live/model/mode.ts); the loader ignores them. */
  repo?: string | string[];
  wave?: string | string[];
}

/** `?mr=N` (digits only, the first if repeated) as the film's focus; anything else is no focus. */
function focusOf(params: TheaterParams): { mr?: number } {
  const raw = firstParam(params.mr);
  return raw !== undefined && /^\d+$/.test(raw) ? { mr: Number(raw) } : {};
}

/** `/theater?mr=N` films MR N first (the illustrative film has no MR, so it ignores it). */
export function loadTheaterData(params: TheaterParams = {}): TheaterData {
  const ds = getDataSource();
  const real = ledgerFilm(ds.getLedger(), focusOf(params));
  if (!real) return illustrative();
  return { film: real, demo: null, subtitle: `${ds.getPortfolio().group} / ${ds.deepProjectId()}` };
}
