'use client';

import { useRef } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { Icon } from '@/components/icons/Icon';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Reveal, Unread, useHostNav } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { Stage } from '@/schemas';
import { RUNGS } from '@/schemas/stages';
import { Crag } from './components/crag/Crag';
import { ScanMeta } from './components/chrome/ScanMeta';
import { StageList, pickedByStage } from './components/chrome/StageList';
import { Stepper } from '@/components/controls/toolbar/Stepper';
import { GapsTable } from './components/gaps/GapsTable';
import { CoreUnreadable, StageListPending, StatusPending } from './components/pending/MaturityPending';
import { SendSheet } from './components/sheet/SendSheet';
import { StatusCounts } from './components/chrome/StatusCounts';
import { MAT_META, projectLabel } from './data/meta';
import { useGapSheet } from './hooks/useGapSheet';
import type { MaturityApi } from './hooks/useMaturity';
import { stagePath, useStepNav } from './hooks/useStepNav';
import { useMaturityShared } from './MaturityProvider';
import { useMaturityKeys } from './hooks/useMaturityKeys';
import { useUiScale } from './hooks/useUiScale';
import { rescanTitle } from './model/flow/moves';
import { MODES } from './model/rungs';
import { STEP_NAMES } from './model/steps';
import type { Step } from './model/state';
import styles from './MaturityScreen.module.css';

/** Live mode: the scan is the maturity-scan component's job, on the schedule the project gave it. */
const LIVE_CADENCE = 'the belay-maturity-scan job, on its pipeline schedule';
const noop = () => undefined;
/** The stepper before the read: the four steps, none open yet. */
const STEPS_UNREAD = STEP_NAMES.map((s) => ({ ...s, enabled: false, current: s.k === 1, past: false, count: null, loud: s.k === 3 }));

/** The keys and the Send sheet: only once the data is read (they act on it). The sheet's writes are the session's. */
function MaturityActs({ api, project, mode, onGo }: { api: MaturityApi; project: string; mode: 'demo' | 'live'; onGo: (k: Step) => void }) {
  const sheet = useGapSheet(api, project, mode);
  useMaturityKeys(api, onGo, sheet.send);
  return api.state.sheet && sheet.rows.length ? <SendSheet api={sheet} onClose={() => api.dispatch({ type: 'cancelSheet' })} /> : null;
}

/**
 * Maturity: nine stage routes on a crag, bolts as rungs. Pick gaps worth exploring, preview the diffs, send them as
 * you (the exact commands are shown first), then watch the simulated merge → run → rescan decide the credit. A stage's
 * evidence, gap and credit history are its own page (/maturity/[stage]); the state is the session's (MaturityProvider).
 * Before the read (`api` null) the same window paints with a dash for every value; `coreError` says why it is unread.
 */
export function MaturityScreen({ coreError }: { coreError?: string } = {}) {
  const { api, project = '', mode = 'demo' } = useMaturityShared();
  const { navigate } = useHostNav();
  const open = (stage: Stage) => navigate(stagePath(stage));
  const scale = useUiScale();
  const gapsRef = useRef<HTMLElement>(null);
  const go = useStepNav(api, 'list');
  const onGo = (k: Step) => {
    if (go(k) && k === 1) gapsRef.current?.scrollIntoView({ block: 'nearest' });
  };
  const ctx = api?.ctx;
  const state = api?.state;

  return (
    <Window
      title="Maturity"
      subtitle={ctx ? projectLabel(ctx, project) : '—'}
      sidebar={
        <Reveal order={1} slice="core">
          {api ? <StageList routes={api.routes} pickedByStage={pickedByStage(api.pending, api.ctx)} selected={api.state.sel} onSelect={open} /> : <StageListPending />}
        </Reveal>
      }
      toolbar={
        <>
          <SegmentedControl label="Crag shows" options={MODES} value={state?.mode ?? 'now'} onChange={api?.setMode ?? noop} />
          <Spacer />
          <Stepper steps={api?.steps ?? STEPS_UNREAD} onGo={onGo} label="Next move" />
          <Spacer />
          {ctx && state ? (
            <ScanMeta engine={ctx.engine} scannedAt={state.scannedAt} ageMin={state.ageMin} scanned={ctx.scanned} cadence={ctx.live ? LIVE_CADENCE : MAT_META.rescanEvery} />
          ) : (
            <ScanMeta engine={<Unread label="engine not read yet" />} scannedAt={<Unread label="scan time not read yet" />} ageMin={null} scanned cadence={MAT_META.rescanEvery} />
          )}
          <ToolbarButton className={styles.rescan} title={ctx && state ? rescanTitle(state, ctx) : 'Rescan: the scan is not read yet'} disabled={!api} onClick={() => api?.dispatch({ type: 'rescanAll' })}>
            <Icon name="probe" />
            Rescan
          </ToolbarButton>
          <HonestyChip kind="simulated" />
        </>
      }
      status={api ? <StatusCounts levels={api.routes.map((r) => r.lv)} /> : <StatusPending />}
    >
      <div className={styles.content}>
        <Reveal order={2} slice="core" className={styles.cragRegion}>
          <Crag
            routes={api?.routes ?? []}
            mode={state?.mode ?? 'now'}
            scannedAt={state?.scannedAt ?? '—'}
            animKey={state?.animKey ?? 0}
            rungNames={ctx?.rungNames ?? RUNGS}
            scale={scale}
            onSelect={open}
            onPick={(id) => api?.dispatch({ type: 'togglePick', id })}
          />
        </Reveal>
        <Reveal order={3} slice="core">
          {coreError && !api ? <CoreUnreadable reason={coreError} /> : null}
          <GapsTable
            gaps={ctx?.gaps ?? []}
            unread={!api}
            picked={state?.picked ?? []}
            flow={state?.flow ?? {}}
            mrs={state?.mrs ?? {}}
            selected={state?.sel ?? 'secure'}
            sectionRef={gapsRef}
            live={ctx?.live}
            onPick={(id) => api?.dispatch({ type: 'togglePick', id })}
            onSelect={(g) => api?.select(g.stage)}
            onOpen={(g) => open(g.stage)}
            onAct={(a) => api?.dispatch(a)}
          />
        </Reveal>
      </div>
      {api ? <MaturityActs api={api} project={project} mode={mode} onGo={onGo} /> : null}
    </Window>
  );
}
