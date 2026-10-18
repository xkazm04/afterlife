import type { LaneOutcome } from '@/schemas/run/run';
import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import type { RunWave } from '../model/types';

export const LANE_TONE: Record<LaneOutcome, ChipTone> = { landed: 'ok', parked: 'you', failed: 'bad', budget: 'lag', timeout: 'bad' };

/** A wave's state chip: running, mergeable, not mergeable. A wave with neither a start nor an end yet says so. */
export function WaveState({ w }: { w: RunWave }) {
  if (w.running) return <Chip compact tone="pending">running</Chip>;
  if (w.mergeable === undefined) return <Chip compact tone="unknown" title="No wave.end in the file">unfinished</Chip>;
  return w.mergeable ? <Chip compact tone="ok">mergeable</Chip> : <Chip compact tone="neutral">not mergeable</Chip>;
}
