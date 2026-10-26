import type { LaneOutcome } from '@/schemas/run/run';
import { Chip, type ChipTone } from '@/components/status/chip/Chip';
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunWave } from '@/lib/runs/types';
import { WAVE_STATE_LABEL, WAVE_STATE_MEANS, waveStateOf, type WaveStateKind } from '../model/waveState';

export const LANE_TONE: Record<LaneOutcome, ChipTone> = { landed: 'ok', parked: 'you', failed: 'bad', budget: 'lag', timeout: 'bad' };

const TONE: Record<WaveStateKind, ChipTone> = { running: 'pending', unfinished: 'unknown', take: 'ok', unasked: 'unknown', in: 'neutral', blocked: 'neutral' };

/** A wave's state chip (model/waveState.ts): "mergeable" only when the desk says there is something to take. */
export function WaveState({ w, needs }: { w: RunWave; needs?: readonly MergeNeed[] }) {
  const k = waveStateOf(w, needs);
  return (
    <Chip compact tone={TONE[k]} title={WAVE_STATE_MEANS[k]}>
      {WAVE_STATE_LABEL[k]}
    </Chip>
  );
}
