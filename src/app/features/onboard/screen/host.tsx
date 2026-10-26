'use client';

// Onboard's demo estate on the screen host (docs/features/screen-host.md). The wizard that used to be /onboard is
// /start now (features/start; /onboard redirects there), so this module draws one key:
// 'onboard/estate', from the core slice; ?preview=1 opens the batch sheet, and the screen is keyed on it:
//   0  window, batch sizes, the funnel's step names, legend     at once
//   1  sidebar (scope)  2  funnel counts  3  groups and baseline  4  next batch  5  inspector     core
import { useRevalidate, useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { OnboardScreen } from '../OnboardScreen';
import type { OnboardData } from '../model/build';

function EstateFrame({ search }: ScreenFrameProps) {
  const core = useSlice<OnboardData>('core');
  const revalidate = useRevalidate();
  const preview = search.get('preview') === '1';
  return <OnboardScreen key={String(preview)} data={core.state === 'ok' ? core.data : undefined} startPreview={preview} onWritten={() => revalidate('onboard/estate')} />;
}

export const screens: readonly ScreenDef[] = [
  { key: 'onboard/estate', ready: true, slices: ['core'], Frame: EstateFrame, title: () => 'Afterlife · Onboard' },
];
