import { loadNeedsYou } from '../features/needs-you/data/pick';
import { NeedsYouEmpty } from '../features/needs-you/NeedsYouEmpty';
import { NeedsYouScreen } from '../features/needs-you/NeedsYouScreen';

export default function NeedsYouPage() {
  const demo = loadNeedsYou();
  return demo ? <NeedsYouScreen demo={demo} /> : <NeedsYouEmpty />;
}
