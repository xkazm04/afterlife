// The Theater's slices for the screen stream (GET /api/screen/theater), in the order the window fills:
//   live  - the runner's .afterlife/runs files as the live film's payload (readRuns: sync fs, fast); GET /api/runs serves the
//           same and the live film keeps polling it;
//   start - the pre-run panel's data (the fleet's repos and their branches: git, kept 5 s; slow). Loopback only: it
//           reads this machine's checkouts;
//   film  - the replay film, only when the address and the payload pick the replay (live/model/pick.ts, the rule the
//           client draws by): mapped here, since the ledger schema imports node:crypto. Otherwise empty (no `film` key).
// live and film read the runs once per request (memo by the request's signal).
import 'server-only';
import { ok, type ModuleLoaders, type SliceCtx } from '@/app/features/screens/types';
import { loadStartData } from '@/server/actions/runs/start/read';
import { loadTheaterData } from '../data/loadTheaterData';
import { modeParamsOf, pickFilm, type LiveRead } from '../live/model/pick';
import { loadLivePayload } from '../live/server/livePayload';
import type { LivePayload } from '../live/model/types';

const reads = new WeakMap<AbortSignal, { payload: LivePayload } | { error: unknown }>();

/** The request's one read of the runs (live and film share it); a failed read is the same failure for both. */
function liveOf(ctx: SliceCtx): LivePayload {
  let r = reads.get(ctx.signal);
  if (!r) {
    try {
      r = { payload: loadLivePayload() };
    } catch (error) {
      r = { error };
    }
    reads.set(ctx.signal, r);
  }
  if ('error' in r) throw r.error;
  return r.payload;
}

function liveRead(ctx: SliceCtx): LiveRead {
  try {
    return { state: 'ok', data: liveOf(ctx) };
  } catch {
    return { state: 'error' };
  }
}

export const loaders: ModuleLoaders = {
  theater: {
    local: ['start'],
    slices: {
      live: (ctx) => ok(liveOf(ctx)),
      start: async () => ok(await loadStartData()),
      film: (ctx) => {
        if (pickFilm(modeParamsOf(ctx.search), liveRead(ctx)).kind !== 'replay') return ok({});
        const mr = ctx.search.get('mr');
        return ok({ film: loadTheaterData(mr === null ? {} : { mr }) });
      },
    },
  },
};
