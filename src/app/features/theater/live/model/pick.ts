// Which film the Theater window shows, from the address and the live payload: the screen host's one rule, on the
// server (which film slice to send) and on the client (which screen to draw), so the two never disagree. Pure.
// Precedence is theaterMode's (mode.ts). Until the payload is read, the address alone decides when it can (?mr=,
// ?live=0, ?live=1); otherwise the film is pending. A payload that could not be read counts as no wave running.
import { theaterMode, waveFocusOf, type ModeParams } from './mode';
import { hasFinishedWave, hasRunningWave, type WaveFocus } from './select';
import type { LivePayload } from './types';

export type FilmPick = { kind: 'pending' } | { kind: 'replay' } | { kind: 'live'; focus?: WaveFocus };

/** The live payload as the pick needs it: read, not read yet, or failed. */
export type LiveRead = { state: 'ok'; data: Pick<LivePayload, 'repos'> } | { state: 'unread' } | { state: 'error' };

export function pickFilm(params: ModeParams, live: LiveRead): FilmPick {
  const focus = waveFocusOf(params);
  if (live.state === 'unread') {
    // a finished wave and "a wave is running" both need the payload; ?mr= and ?live= do not
    if (focus) return theaterMode(params, false) === 'replay' ? { kind: 'replay' } : { kind: 'pending' };
    const bare = theaterMode(params, false);
    if (bare === theaterMode(params, true)) return bare === 'live' ? { kind: 'live' } : { kind: 'replay' };
    return { kind: 'pending' };
  }
  const repos = live.state === 'ok' ? live.data : { repos: [] };
  const mode = theaterMode(params, hasRunningWave(repos));
  if (mode === 'wave' && focus && hasFinishedWave(repos, focus)) return { kind: 'live', focus };
  if (mode === 'live') return { kind: 'live' };
  return { kind: 'replay' };
}

/** The address's film params from a query (the first value of each, as the page's searchParams gave them). */
export function modeParamsOf(search: URLSearchParams): ModeParams {
  const p: ModeParams = {};
  for (const k of ['mr', 'live', 'repo', 'wave'] as const) {
    const v = search.get(k);
    if (v !== null) p[k] = v;
  }
  return p;
}
