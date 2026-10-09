import { loadTheaterData } from '../features/theater/data/loadTheaterData';
import { TheaterScreen } from '../features/theater/TheaterScreen';

export default function TheaterPage() {
  return <TheaterScreen {...loadTheaterData()} />;
}
