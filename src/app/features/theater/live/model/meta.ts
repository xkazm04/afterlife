// What the fold drops, read off one wave's parsed events: the newest ts, the cap, the planned lanes, each lane's start.
import type { RunEvent } from '@/schemas/run/run';
import type { WaveMeta } from './types';

export function waveMetaOf(events: readonly RunEvent[]): WaveMeta | null {
  const last = events.at(-1);
  if (!last) return null;
  const m: WaveMeta = { lastEventAt: last.ts, laneStartedAt: {} };
  for (const e of events) {
    if (e.kind === 'wave.start') {
      m.waveCapUsd = e.waveCapUsd;
      m.lanesPlanned = e.lanes;
    } else if (e.kind === 'lane.start') m.laneStartedAt[e.lane] = e.ts;
  }
  return m;
}
