import { pickNeedsYouDemo } from '../features/needs-you/data/pick';
import { NeedsYouScreen } from '../features/needs-you/NeedsYouScreen';

export default function NeedsYouPage() {
  return <NeedsYouScreen demo={pickNeedsYouDemo()} />;
}
