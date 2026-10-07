// What the Fleet reads that the two sources serve differently on purpose, on the server: the mode (live mode re-polls
// through a server action, and labels the demo text it still shows) and the deep project's recent events (the demo's
// feed, or read from the index's tasks, proofs and poll state). parity.test.ts lists both where live differs from demo.
import { getDataSource } from '@/server/data';
import type { FleetSource } from '../model/types';

export function loadFleetSource(): FleetSource {
  const ds = getDataSource();
  return { mode: ds.mode, events: ds.getEvents() };
}
