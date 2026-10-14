// The Setup node route's loader: which unlock-map node a /setup/[node] segment names, or null (the page then 404s).
// The catalogue gives the steps, the tracks and the capability names, in demo and in live mode alike.
import { getDataSource } from '@/server/data';
import { parseNodeKey } from '../model/nodeKey';
import type { Focus } from '../model/types';
import { CAP_SHORT } from './capabilities';

export function loadSetupNode(key: string): Focus | null {
  const ds = getDataSource();
  const steps = ds.getSetup().phases.flatMap((ph) => ph.steps.map(([n]) => n));
  return parseNodeKey(key, { steps, tracks: ds.getTracks().map((t) => t.id), caps: Object.keys(CAP_SHORT) });
}
