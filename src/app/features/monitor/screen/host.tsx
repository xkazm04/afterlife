'use client';

// The Monitor for the screen host (the reference conversion: docs/features/screen-host.md). The window, its title,
// toolbar (Sweep) and legend paint in the click's frame; the rest fills from the stream (screen/slices.ts).
// Reveal order:
//   0  window chrome, toolbar, legend          at once
//   1  sidebar (signals and leads)             core
//   2  answer band (the big number, readout)   core
//   3  leads                                   core
//   4  inspector                               core
//   -  week note (estate) and spend line (desk) enter in place when they land, inside the band
import type { MonitorData, MonitorEstate } from '../model/types';
import { MonitorScreen } from '../MonitorScreen';
import { useRevalidate, useSlice, type ScreenDef } from '@/components/shell/host';

function MonitorFrame() {
  const core = useSlice<MonitorData>('core');
  const signals = useSlice<Pick<MonitorEstate, 'stability' | 'trend'>>('estate');
  const desk = useSlice<Pick<MonitorEstate, 'cost'>>('desk');
  const revalidate = useRevalidate();
  const estate: Partial<MonitorEstate> = {
    ...(signals.state === 'ok' ? signals.data : {}),
    ...(desk.state === 'ok' ? desk.data : {}),
  };
  return (
    <MonitorScreen
      data={core.state === 'ok' ? core.data : undefined}
      coreError={core.state === 'error' ? core.reason : undefined}
      estate={estate}
      onPolled={() => revalidate('monitor')}
    />
  );
}

export const screens: readonly ScreenDef[] = [
  {
    key: 'monitor',
    ready: true,
    slices: ['core', 'estate', 'desk'],
    Frame: MonitorFrame,
    title: () => 'Afterlife · Monitor',
  },
];
