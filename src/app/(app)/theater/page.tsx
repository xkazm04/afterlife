import type { Metadata } from 'next';
import { loadTheaterData, type TheaterParams } from '@/app/features/theater/data/loadTheaterData';
import { LiveScreen } from '@/app/features/theater/live/LiveScreen';
import { theaterMode, waveFocusOf } from '@/app/features/theater/live/model/mode';
import { hasFinishedWave, hasRunningWave } from '@/app/features/theater/live/model/select';
import { loadLivePayload } from '@/app/features/theater/live/server/livePayload';
import { TheaterScreen } from '@/app/features/theater/TheaterScreen';
import { connection } from 'next/server';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: 'Belay Theater' };

// Theater: the film is read on the server. Precedence (live/model/mode.ts): `?mr=N` > `?repo=&wave=` (that finished wave, live screen) > `?live=1` > a running wave >
// the ledger film > the illustrative film. `?mr=N` films that MR first (the Ladder's live moves link here), so the
// server render and the first client render agree on take 1.
export default async function TheaterPage({ searchParams }: { searchParams: Promise<TheaterParams> }) {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const params = await searchParams;
  const live = loadLivePayload();
  const mode = theaterMode(params, hasRunningWave(live));
  const focus = waveFocusOf(params);
  if (mode === 'wave' && focus && hasFinishedWave(live, focus)) return <LiveScreen initial={live} focus={focus} />;
  if (mode === 'live') return <LiveScreen initial={live} />;
  return <TheaterScreen {...loadTheaterData(params)} />;
}
