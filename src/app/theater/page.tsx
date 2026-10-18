import { loadTheaterData, type TheaterParams } from '../features/theater/data/loadTheaterData';
import { LiveScreen } from '../features/theater/live/LiveScreen';
import { theaterMode } from '../features/theater/live/model/mode';
import { hasRunningWave } from '../features/theater/live/model/select';
import { loadLivePayload } from '../features/theater/live/server/livePayload';
import { TheaterScreen } from '../features/theater/TheaterScreen';

// Theater: the film is read on the server. Precedence (live/model/mode.ts): `?mr=N` > `?live=1` > a running wave >
// the ledger film > the illustrative film. `?mr=N` films that MR first (the Ladder's live moves link here), so the
// server render and the first client render agree on take 1.
export default async function TheaterPage({ searchParams }: { searchParams: Promise<TheaterParams> }) {
  const params = await searchParams;
  const live = loadLivePayload();
  if (theaterMode(params, hasRunningWave(live)) === 'live') return <LiveScreen initial={live} />;
  return <TheaterScreen {...loadTheaterData(params)} />;
}
