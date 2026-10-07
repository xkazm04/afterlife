// What the Fleet reads that the two sources serve differently on purpose, on the server: the mode (live mode re-polls
// through a server action), the deep project's recent events (the demo's feed, or read from the index's tasks, proofs
// and poll state) and which demo text sits beside live data and is labelled. parity.test.ts lists them where live
// differs from demo.
import { getDataSource } from '@/server/data';
import type { FleetSource } from '../model/types';

export function loadFleetSource(): FleetSource {
  const ds = getDataSource();
  const shown = (part: (typeof ds.illustrative)[number]) => ds.illustrative.includes(part);
  return { mode: ds.mode, events: ds.getEvents(), illustrative: { tracks: shown('tracks'), cockpit: shown('cockpit') } };
}
