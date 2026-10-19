// Which film /theater plays. One explicit precedence, pure so it is tested:
//   ?mr=N (the Ladder's Replay !N must replay)  >  ?live=0 (Replay, asked for while a wave runs)  >  ?live=1  >  a wave is running  >  the ledger film  >  the illustrative film.
// The last two are the loader's own call (data/loadTheaterData.ts); here the question is only live or replay.
export type TheaterMode = 'live' | 'replay';

export interface ModeParams {
  mr?: string | readonly string[];
  live?: string | readonly string[];
}

const first = (v: string | readonly string[] | undefined): string | undefined => (typeof v === 'string' || v === undefined ? v : v[0]);

export function theaterMode(params: ModeParams, waveRunning: boolean): TheaterMode {
  const mr = first(params.mr);
  if (mr !== undefined && /^\d+$/.test(mr)) return 'replay';
  if (first(params.live) === '0') return 'replay';
  if (first(params.live) === '1') return 'live';
  return waveRunning ? 'live' : 'replay';
}
