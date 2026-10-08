import type { Metadata } from 'next';
import { loadTheaterData } from '../features/theater/data/loadTheaterData';
import { TheaterScreen } from '../features/theater/TheaterScreen';

export const metadata: Metadata = { title: 'Theater' };

export default function TheaterPage() {
  return <TheaterScreen demo={loadTheaterData()} />;
}
