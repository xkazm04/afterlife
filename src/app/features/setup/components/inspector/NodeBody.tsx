'use client';

import type { Focus } from '../../model/types';
import { CapPanel } from './CapPanel';
import { StepPanel } from './StepPanel';
import { TrackPanel } from './TrackPanel';

/** The sections of a node's page: the step's, the track's or the capability's. */
export function NodeBody({ focus }: { focus: Focus }) {
  if (focus.k === 'step') return <StepPanel n={focus.id} />;
  if (focus.k === 'track') return <TrackPanel id={focus.id} />;
  return <CapPanel name={focus.id} />;
}
