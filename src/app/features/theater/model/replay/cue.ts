// The address a screen opens on, read once on mount. Pure: the hook hands it `location.hash + location.search`.
import { indexOfSeq, type Reel } from './state';

/** Where the film opens: on entry `i` (settled, paused), or on a seq it does not hold (named, never played as take 1). */
export type Cue = { i: number } | { missingSeq: number };

/** `#seq=NNN` (or `?seq=NNN`) cues that entry; a seq the film does not hold is `missingSeq`; no seq is null (autoplay). */
export function cueOf(reel: Reel, address: string): Cue | null {
  const m = /seq=(\d+)/.exec(address);
  if (!m) return null;
  const seq = Number(m[1]);
  const i = indexOfSeq(seq, reel);
  return i >= 0 ? { i } : { missingSeq: seq };
}
