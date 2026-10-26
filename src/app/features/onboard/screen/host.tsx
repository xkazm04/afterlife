'use client';

// Onboard on the screen host (docs/features/screen-host.md).
// 'onboard' (the wizard), from the repos slice (loopback only: a refused request shows the "your own machine" note):
//   0  window, engine control, steps 2 and 3, the footer link   at once
//   1  step 1: the repo rows and their count                     repos
//   The wizard's run (a proposal takes about a minute) lives in the screen: leaving keeps it, the host keeps the screen.
// 'onboard/estate', from the core slice; ?preview=1 opens the batch sheet, and the screen is keyed on it:
//   0  window, batch sizes, the funnel's step names, legend     at once
//   1  sidebar (scope)  2  funnel counts  3  groups and baseline  4  next batch  5  inspector     core
import { useRevalidate, useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { OnboardScreen } from '../OnboardScreen';
import type { OnboardData } from '../model/build';
import { reposOf, type ReposRead } from '../wizard/model/repos';
import { WizardScreen } from '../wizard/WizardScreen';

function WizardFrame() {
  const read = reposOf(useSlice<ReposRead>('repos'));
  const revalidate = useRevalidate();
  return <WizardScreen repos={read.repos} note={read.note} onSaved={() => revalidate('onboard')} />;
}

function EstateFrame({ search }: ScreenFrameProps) {
  const core = useSlice<OnboardData>('core');
  const revalidate = useRevalidate();
  const preview = search.get('preview') === '1';
  return <OnboardScreen key={String(preview)} data={core.state === 'ok' ? core.data : undefined} startPreview={preview} onWritten={() => revalidate('onboard/estate')} />;
}

export const screens: readonly ScreenDef[] = [
  { key: 'onboard', ready: true, slices: ['repos'], Frame: WizardFrame, title: () => 'Belay Onboard' },
  { key: 'onboard/estate', ready: true, slices: ['core'], Frame: EstateFrame, title: () => 'Belay Onboard' },
];
