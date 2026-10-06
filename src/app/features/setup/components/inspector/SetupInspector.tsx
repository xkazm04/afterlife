'use client';

import { useSetup } from '../../hooks/SetupContext';
import { CapPanel } from './CapPanel';
import { DefaultPanel } from './DefaultPanel';
import { StepPanel } from './StepPanel';
import { TrackPanel } from './TrackPanel';
import { useOpenSections } from './parts/useOpenSections';

/** Layer 2: what stands (nothing picked), or the detail of the picked step, track or capability. */
export function SetupInspector() {
  const { view } = useSetup();
  const section = useOpenSections();
  const sel = view.sel;
  if (!sel) return <DefaultPanel section={section} />;
  if (sel.k === 'step') return <StepPanel n={sel.id} section={section} />;
  if (sel.k === 'track') return <TrackPanel id={sel.id} section={section} />;
  return <CapPanel name={sel.id} section={section} />;
}
