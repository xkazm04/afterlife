// Which unlock-map node a /setup/[node] segment names, or null (the screen stream then answers notFound). The
// catalogue gives the steps and the tracks, in demo and in live mode alike. The capability names are the demo's
// (CAP_SHORT) in demo mode and the doctor's row labels in live mode, the names the live map links to.
import { getDataSource } from '@/server/data';
import { parseNodeKey, universeOf } from '../model/nodeKey';
import type { Focus } from '../model/types';

export function loadSetupNode(key: string): Focus | null {
  const ds = getDataSource();
  const steps = ds.getSetup().phases.flatMap((ph) => ph.steps.map(([n]) => n));
  return parseNodeKey(key, universeOf(steps, ds.getTracks().map((t) => t.id), ds.mode === 'live'));
}
