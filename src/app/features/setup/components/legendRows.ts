import type { ArmStatus, StepStatus } from '../model/types';

/** One legend row: the swatch class (SetupLegend.module.css), the words, and the states of the model it explains. */
export interface LegendRow<S extends string> {
  cls: string;
  text: string;
  covers: readonly S[];
}

/** Track node states the map draws. Every ArmStatus belongs to exactly one row (SetupLegend.test.tsx pins it). */
export const TRACK_ROWS: readonly LegendRow<ArmStatus>[] = [
  { cls: 'arm', text: 'Armed · revert disarms', covers: ['armed'] },
  { cls: 'rdy', text: 'Ready to arm · one MR', covers: ['ready'] },
  { cls: 'open', text: 'Waiting on you · merge the MR', covers: ['open'] },
  { cls: 'open', text: 'Probing · a read is in flight', covers: ['probing'] },
  { cls: 'lck', text: 'Locked · hover says why', covers: ['locked'] },
  { cls: 'unk', text: 'Unknown or not defined · never rounded up', covers: ['unknown', 'undefined'] },
];

/** Step marks the map draws. Every StepStatus belongs to exactly one row. */
export const STEP_ROWS: readonly LegendRow<StepStatus>[] = [
  { cls: 'stodo', text: 'Step to do · agent or you', covers: ['todo'] },
  { cls: 'shuman', text: 'Needs you · only a person can', covers: ['human'] },
  { cls: 'sprobe', text: 'Step probing · a read is in flight', covers: ['probing'] },
  { cls: 'sdone', text: 'Step probed · a read saw it done', covers: ['done'] },
  { cls: 'sfail', text: 'Step probed · not yet', covers: ['failed'] },
  { cls: 'sunk', text: 'Step unknown · nobody probed it', covers: ['unknown'] },
];
