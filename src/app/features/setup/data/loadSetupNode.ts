// The Setup node route's loader: which unlock-map node a /setup/[node] segment names, or null (the page then 404s).
// The catalogue gives the steps and the tracks, in demo and in live mode alike. The capability names are the demo's
// (CAP_SHORT) in demo mode and the doctor's row labels in live mode, the names the live map links to.
import { getDataSource } from '@/server/data';
import { parseNodeKey } from '../model/nodeKey';
import type { Focus } from '../model/types';
import { CAP_SHORT } from './capabilities';
import { LIVE_CAP_LABELS } from './live/liveCapabilities';

export function loadSetupNode(key: string): Focus | null {
  const ds = getDataSource();
  const steps = ds.getSetup().phases.flatMap((ph) => ph.steps.map(([n]) => n));
  return parseNodeKey(key, { steps, tracks: ds.getTracks().map((t) => t.id), caps: ds.mode === 'live' ? LIVE_CAP_LABELS : Object.keys(CAP_SHORT) });
}
