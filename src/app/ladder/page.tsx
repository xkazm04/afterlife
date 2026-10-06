import { loadLadderData } from '../features/ladder/data/loadLadderData';
import { LadderScreen } from '../features/ladder/LadderScreen';

export default function LadderPage() {
  return <LadderScreen {...loadLadderData()} />;
}
