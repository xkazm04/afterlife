// Which film /theater plays. One explicit precedence, pure so it is tested:
//   ?mr=N (the Ladder's Replay !N must replay)  >  ?repo=R&wave=N (the header's replay link: that finished wave, shown by the live screen from the wave data it reads; the page falls back to the replay film when the payload no longer holds it)  >  ?live=0 (Replay, asked for while a wave runs; with no wave it is the ledger or illustrative film, as before)  >  ?live=1  >  a wave is running  >  the ledger film  >  the illustrative film.
// The last two are the loader's own call (data/loadTheaterData.ts); here the question is only live or replay.
export type TheaterMode = 'live' | 'replay' | 'wave';

export interface ModeParams {
  mr?: string | readonly string[];
  live?: string | readonly string[];
  repo?: string | readonly string[];
  wave?: string | readonly string[];
}

const first = (v: string | readonly string[] | undefined): string | undefined => (typeof v === 'string' || v === undefined ? v : v[0]);

/** `?repo=R&wave=N` (N digits only) as the finished wave asked for; anything else is none. */
export function waveFocusOf(params: ModeParams): { repo: string; wave: number } | undefined {
  const repo = first(params.repo);
  const wave = first(params.wave);
  if (repo === undefined || repo === '' || wave === undefined || !/^\d+$/.test(wave)) return undefined;
  return { repo, wave: Number(wave) };
}

export function theaterMode(params: ModeParams, waveRunning: boolean): TheaterMode {
  const mr = first(params.mr);
  if (mr !== undefined && /^\d+$/.test(mr)) return 'replay';
  if (waveFocusOf(params)) return 'wave';
  if (first(params.live) === '0') return 'replay';
  if (first(params.live) === '1') return 'live';
  return waveRunning ? 'live' : 'replay';
}
