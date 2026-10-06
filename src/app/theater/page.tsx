import { getLoop, getMaturity, getStages, getTasks, getTracks } from '@/lib/demo';
import { TheaterScreen } from '../features/theater/TheaterScreen';
import type { TheaterDemo } from '../features/theater/model/types';

export default function TheaterPage() {
  const tracks = getTracks();
  const maturity = getMaturity();
  const demo: TheaterDemo = {
    stages: getStages(),
    tracksArmed: tracks.filter((t) => t.armed).length,
    tracksTotal: tracks.length,
    loop: getLoop(),
    rungNames: maturity.rungNames,
    rungs: maturity.rungs,
    // the untrusted line quoted from the seeded !44 (task 01J8Q9)
    quote: getTasks().find((t) => t.mr === '!44')?.quote ?? '',
  };
  return <TheaterScreen demo={demo} />;
}
