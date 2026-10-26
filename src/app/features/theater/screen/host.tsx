'use client';

// The Theater on the screen host (docs/features/screen-host.md). Three slices: `live` (the runner's files, fast), `start`
// (the pre-run panel's repos and branches: git, slow, loopback only) and `film` (the replay film, only when it is the
// one picked). Which film shows is live/model/pick.ts, the same rule the server sends the film by: from the address and
// the live payload. The window, its title and toolbar paint in the click's frame; "New run…" joins when `start` lands.
// Reveal order:
//   0  window chrome, title, toolbar, status                       at once (TheaterPending until the film is picked and read)
//   1  the stage (the replay's or the live film's)                 film / live
//   2  the takes and marks (sidebar; replay only)                  film
//   3  the beat inspector (replay only)                            film
// The live film keeps polling GET /api/runs every 2 s while shown (the host's Activity pauses it when hidden).
import { NOT_LOCAL } from '@/components/shell/host/model/wire';
import { useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import type { StartData } from '@/server/actions/runs/start/types';
import { TheaterPending } from '../components/TheaterPending';
import { LiveScreen } from '../live/LiveScreen';
import { modeParamsOf, pickFilm } from '../live/model/pick';
import type { LivePayload } from '../live/model/types';
import type { TheaterData } from '../model/types';
import { TheaterScreen } from '../TheaterScreen';

/** The film slice: the replay film when it is the one picked, else empty. */
interface FilmSlice {
  film?: TheaterData;
}

/** Off this machine the panel reads nothing: "New run…" stays, and says why it cannot start one. */
const AWAY: StartData = { repos: [], branches: {}, closed: 'a run starts only from this machine (the server answers the panel to a loopback address only)' };

/** A key for one replay film: another film (or a grown ledger) is a new store; the same film read again is not. */
const filmKey = (d: TheaterData): string => `${d.film.source}:${d.film.takes.length}:${d.film.entries.length}:${d.subtitle}`;

function TheaterFrame({ search }: ScreenFrameProps) {
  const live = useSlice<LivePayload>('live');
  const startRead = useSlice<StartData>('start');
  const film = useSlice<FilmSlice>('film');
  const start = startRead.state === 'ok' ? startRead.data : startRead.state === 'error' && startRead.reason === NOT_LOCAL ? AWAY : undefined;
  const params = modeParamsOf(search);
  const pick = pickFilm(params, live.state === 'ok' ? live : live.state === 'unread' ? live : { state: 'error' });

  if (pick.kind === 'live') {
    if (live.state === 'ok') return <LiveScreen initial={live.data} focus={pick.focus} start={start} />;
    if (live.state === 'error') return <TheaterPending start={start} error={live.reason} />;
    return <TheaterPending start={start} />;
  }
  if (pick.kind === 'replay') {
    if (film.state === 'ok' && film.data.film) return <TheaterScreen key={filmKey(film.data.film)} {...film.data.film} start={start} />;
    if (film.state === 'error') return <TheaterPending start={start} error={film.reason} />;
  }
  return <TheaterPending start={start} />;
}

export const screens: readonly ScreenDef[] = [
  { key: 'theater', ready: true, slices: ['live', 'start', 'film'], Frame: TheaterFrame, title: () => 'Belay Theater' },
];
