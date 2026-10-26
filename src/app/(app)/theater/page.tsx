import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Afterlife · Theater' };

// Theater: a static shell. The screen host draws the window at once and reads the film over the screen stream
// (features/theater/screen/slices.ts: the live payload, the pre-run panel's data, and the replay film when it is the one
// picked). Precedence (live/model/mode.ts, pick.ts): `?mr=N` > `?repo=&wave=` > `?live=0` > `?live=1` > a running wave >
// the ledger film > the illustrative film.
export default function TheaterPage() {
  return null;
}
