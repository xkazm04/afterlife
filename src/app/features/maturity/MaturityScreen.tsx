'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Window } from '@/components/shell/Window';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { Stage } from '@/schemas';
import { Crag } from './components/crag/Crag';
import { ScanMeta } from './components/chrome/ScanMeta';
import { StageList, pickedByStage } from './components/chrome/StageList';
import { Stepper } from '@/components/controls/toolbar/Stepper';
import { GapsTable } from './components/gaps/GapsTable';
import { SendSheet } from './components/sheet/SendSheet';
import { StatusCounts } from './components/chrome/StatusCounts';
import { MAT_META } from './data/meta';
import { useGapSheet } from './hooks/useGapSheet';
import { stagePath, useStepNav } from './hooks/useStepNav';
import { useMaturityShared } from './MaturityProvider';
import { useMaturityKeys } from './hooks/useMaturityKeys';
import { useUiScale } from './hooks/useUiScale';
import { MODES } from './model/rungs';
import type { Step } from './model/state';
import styles from './MaturityScreen.module.css';

/** Live mode: the scan is the maturity-scan component's job, on the schedule the project gave it. */
const LIVE_CADENCE = 'the belay-maturity-scan job, on its pipeline schedule';

/**
 * Maturity: nine stage routes on a crag, bolts as rungs. Pick gaps worth exploring, preview the diffs, send them as
 * you (the exact commands are shown first), then watch the simulated merge → run → rescan decide the credit. A stage's
 * evidence, gap and credit history are its own page (/maturity/[stage]); the state is shared through the layout.
 */
export function MaturityScreen() {
  const { api, project, mode } = useMaturityShared();
  const { ctx, state, dispatch, routes, steps, pending, select, setMode } = api;
  const router = useRouter();
  const open = (stage: Stage) => router.push(stagePath(stage));
  const scale = useUiScale();
  const gapsRef = useRef<HTMLElement>(null);
  const go = useStepNav(api, 'list');

  const onGo = (k: Step) => {
    if (go(k) && k === 1) gapsRef.current?.scrollIntoView({ block: 'nearest' });
  };
  const sheetGaps = pending.flatMap((id) => ctx.gap(id) ?? []);
  const sheet = useGapSheet(sheetGaps, state.sheet, project, mode);
  const closeSheet = () => {
    const opened = sheet.opened;
    const n = Object.keys(opened).length;
    const text = sheet.rows.filter((r) => r.answer?.status === 'done').map((r) => r.answer?.text).join(' | ');
    dispatch(n ? { type: 'sent', opened, text } : { type: 'cancelSheet' });
  };
  useMaturityKeys(api, onGo, sheet.send);

  return (
    <Window
      title="Maturity"
      subtitle={ctx.live ? project : MAT_META.project.replace('/', ' / ')}
      sidebar={<StageList routes={routes} pickedByStage={pickedByStage(pending, ctx)} selected={state.sel} onSelect={open} />}
      toolbar={
        <>
          <SegmentedControl label="Crag shows" options={MODES} value={state.mode} onChange={setMode} />
          <Spacer />
          <Stepper steps={steps} onGo={onGo} label="Next move" />
          <Spacer />
          <ScanMeta engine={ctx.engine} scannedAt={state.scannedAt} ageMin={state.ageMin} scanned={ctx.scanned} cadence={ctx.live ? LIVE_CADENCE : MAT_META.rescanEvery} />
          <ToolbarButton className={styles.rescan} title="Rescan, read only (R). Simulated: nothing is scanned, no rung moves" onClick={() => dispatch({ type: 'rescanAll' })}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true" className={styles.rescanIcon}>
              <path d="M10.2 4.6A4.5 4.5 0 1 0 10.5 7" />
              <path d="M10.6 1.6v3h-3" />
            </svg>
            Rescan
          </ToolbarButton>
          <HonestyChip kind="simulated" />
        </>
      }
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
          onSelect={open}
          onPick={(id) => dispatch({ type: 'togglePick', id })}
        />
        <GapsTable
          gaps={ctx.gaps}
          picked={state.picked}
          flow={state.flow}
          mrs={state.mrs}
          selected={state.sel}
          sectionRef={gapsRef}
          live={ctx.live}
          onPick={(id) => dispatch({ type: 'togglePick', id })}
          onSelect={(g) => select(g.stage)}
          onOpen={(g) => open(g.stage)}
        />
      </div>
      {state.sheet && sheetGaps.length ? <SendSheet api={sheet} onClose={closeSheet} /> : null}
    </Window>
  );
}
