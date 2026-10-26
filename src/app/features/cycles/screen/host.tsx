'use client';

// Cycles on the screen host (docs/features/screen-host.md). One key for both scopes: ?scope=estate draws the estate, any
// other scope the project; ?design=1 opens the designer, and the project screen is keyed on it (a new instance).
// The window, its title, the scope switch, the legend and the grid's stage rows paint in the click's frame.
// Reveal order, project scope (all on core):
//   0  window chrome, toolbar, legend, stage rows     at once
//   1  sidebar (the cycles)                           core
//   2  answer band                                    core
//   3  the stage x cycle grid                         core
//   4  the selected cycle (rail and changes)          core
//   5  inspector                                      core
// Estate scope: 1 sidebar (groups), 2 band, 3 table, 4 inspector on estate; its "Every cycle" fills in place on estateCycles.
import { useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import { CyclesScreen } from '../CyclesScreen';
import { EstateScreen } from '../components/estate/EstateScreen';
import type { CyclesData } from '../model/build';
import { isEstateSummary, type EstateCycles } from '../model/estate/split';

/** A core answer is the project's cycles, not the empty one the estate scope gets (kept a moment across a scope switch). */
const isCycles = (v: unknown): v is CyclesData => typeof v === 'object' && v !== null && Array.isArray((v as { cycles?: unknown }).cycles);

function EstateFrame() {
  const estate = useSlice<unknown>('estate');
  const cycles = useSlice<EstateCycles>('estateCycles');
  const data = estate.state === 'ok' && isEstateSummary(estate.data) ? estate.data : undefined;
  return <EstateScreen data={data} cycles={data && cycles.state === 'ok' ? cycles.data : undefined} />;
}

function ProjectFrame({ design }: { design: boolean }) {
  const core = useSlice<unknown>('core');
  return (
    <CyclesScreen
      data={core.state === 'ok' && isCycles(core.data) ? core.data : undefined}
      coreError={core.state === 'error' ? core.reason : undefined}
      startDesign={design}
    />
  );
}

function CyclesFrame({ search }: ScreenFrameProps) {
  if (search.get('scope') === 'estate') return <EstateFrame />;
  const design = search.get('design') === '1';
  return <ProjectFrame key={String(design)} design={design} />;
}

export const screens: readonly ScreenDef[] = [
  {
    key: 'cycles',
    ready: true,
    slices: ['core', 'estate', 'estateCycles'],
    Frame: CyclesFrame,
    title: () => 'Belay Cycles',
  },
];
