import type { Metadata } from 'next';
import { loadLadderData } from '../features/ladder/data/loadLadderData';
import { LadderScreen } from '../features/ladder/LadderScreen';

export const metadata: Metadata = { title: 'Ladder' };

export default function LadderPage() {
  return <LadderScreen {...loadLadderData()} />;
}
