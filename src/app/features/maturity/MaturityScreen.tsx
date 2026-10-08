'use client';

import { useRef, useState } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Window } from '@/components/shell/Window';
import type { DemoData } from '@/lib/demo';
import type { Stage } from '@/schemas';
import { Crag } from './components/crag/Crag';
import { ScanMeta } from './components/chrome/ScanMeta';
import { StageList } from './components/chrome/StageList';
import { Stepper } from '@/components/controls/toolbar/Stepper';
import { GapsTable } from './components/gaps/GapsTable';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { SendSheet } from './components/sheet/SendSheet';
import { StatusCounts } from './components/chrome/StatusCounts';
import { MAT_META } from './data/meta';
import { useGapWrites } from './hooks/useGapWrites';
import { useMaturity } from './hooks/useMaturity';
import { useMaturityKeys } from './hooks/useMaturityKeys';
import { useUiScale } from './hooks/useUiScale';
import { MODES } from './model/rungs';
import type { Step } from './model/state';
import styles from './MaturityScreen.module.css';

/**
 * Maturity: nine stage routes on a crag, bolts as rungs. Pick gaps worth exploring, preview the diffs, send them as
 * you (the exact commands are shown first), then watch the simulated merge → run → rescan decide the credit.
 */
export function MaturityScreen({ maturity, stages }: { maturity: DemoData['maturity']; stages: readonly Stage[] }) {
  const api = useMaturity(maturity, stages);
  const { ctx, state, dispatch, routes, steps, pending, go, select, setMode } = api;
  const scale = useUiScale();
  const gapsRef = useRef<HTMLElement>(null);
  const [inspOpen, setInspOpen] = useState(true);

  const onGo = (k: Step) => {
    if (!go(k)) return;
    if (k === 2 || k === 4) setInspOpen(true);
    if (k === 1) gapsRef.current?.scrollIntoView({ block: 'nearest' });
  };
  const sheetGaps = pending.flatMap((id) => ctx.gap(id) ?? []);
  const writes = useGapWrites(state.sheet, sheetGaps, () => dispatch({ type: 'send' }));
  const send = () => void writes.send();
  useMaturityKeys(api, onGo, send);

  const pickedByStage: Partial<Record<Stage, string>> = {};
  for (const g of ctx.gaps) if (state.picked.includes(g.id) && !state.flow[g.id]) pickedByStage[g.stage] = g.id;

  return (
    <Window
      title="Maturity"
      subtitle={MAT_META.project.replace('/', ' / ')}
      sidebar={<StageList routes={routes} pickedByStage={pickedByStage} selected={state.sel} onSelect={select} />}
      toolbar={
        <>
          <SegmentedControl label="Crag shows" options={MODES} value={state.mode} onChange={setMode} />
          <Spacer />
          <Stepper steps={steps} onGo={onGo} label="Next move" />
          <Spacer />
          <ScanMeta engine={ctx.engine} scannedAt={state.scannedAt} ageMin={state.ageMin} cadence={MAT_META.rescanEvery} />
          <ToolbarButton className={styles.rescan} title="Rescan, read only (R)" onClick={() => dispatch({ type: 'rescanAll' })}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true" className={styles.rescanIcon}>
              <path d="M10.2 4.6A4.5 4.5 0 1 0 10.5 7" />
              <path d="M10.6 1.6v3h-3" />
            </svg>
            Rescan
          </ToolbarButton>
        </>
      }
      inspector={<InspectorPanel api={api} />}
      inspectorOpen={inspOpen}
      onInspectorOpenChange={setInspOpen}
      status={<StatusCounts levels={routes.map((r) => r.lv)} />}
    >
      <div className={styles.content}>
        <Crag
          routes={routes}
          mode={state.mode}
          scannedAt={state.scannedAt}
          animKey={state.animKey}
          rungNames={ctx.rungNames}
          scale={scale}
          onSelect={select}
          onPick={(id) => dispatch({ type: 'togglePick', id })}
        />
        <GapsTable
          gaps={ctx.gaps}
          picked={state.picked}
          flow={state.flow}
          selected={state.sel}
          sectionRef={gapsRef}
          onPick={(id) => dispatch({ type: 'togglePick', id })}
          onSelect={(g) => select(g.stage)}
        />
      </div>
      {state.sheet && sheetGaps.length ? <SendSheet gaps={sheetGaps} writes={writes.entries} ready={writes.ready} onCancel={() => dispatch({ type: 'cancelSheet' })} onSend={send} /> : null}
    </Window>
  );
}
