import { loadTheaterData, type TheaterParams } from '../features/theater/data/loadTheaterData';
import { TheaterScreen } from '../features/theater/TheaterScreen';

// Theater: the film is read on the server. `?mr=N` films that MR first (the Ladder's live moves link here), so the
// server render and the first client render agree on take 1.
export default async function TheaterPage({ searchParams }: { searchParams: Promise<TheaterParams> }) {
  return <TheaterScreen {...loadTheaterData(await searchParams)} />;
}
