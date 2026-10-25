// What the fold drops, read off one wave's parsed events: the newest ts, the cap, the planned lanes, each lane's start,
// whether the wave only proposes, and the plan's items (a propose-only wave's whole answer: it runs no lane).
import type { RunEvent } from '@/schemas/run/run';
import type { WaveMeta } from './types';

/** A propose-only wave says so on wave.start (`mode: 'propose'`) and wave.end (`proposeOnly: true`); absent is execute. */
const proposing = (e: RunEvent): boolean => {
  const x = e as { mode?: unknown; proposeOnly?: unknown };
  return x.mode === 'propose' || x.proposeOnly === true;
};

export function waveMetaOf(events: readonly RunEvent[]): WaveMeta | null {
  const last = events.at(-1);
  if (!last) return null;
  const m: WaveMeta = { lastEventAt: last.ts, laneStartedAt: {} };
  for (const e of events) {
    if (e.kind === 'wave.start') {
      m.waveCapUsd = e.waveCapUsd;
      m.lanesPlanned = e.lanes;
      if (proposing(e)) m.proposeOnly = true;
    } else if (e.kind === 'wave.plan') m.planned = [...e.items];
    else if (e.kind === 'wave.end' && proposing(e)) m.proposeOnly = true;
    else if (e.kind === 'lane.start') m.laneStartedAt[e.lane] = e.ts;
  }
  return m;
}
