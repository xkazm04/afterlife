'use client';

// Maturity's screens for the screen host (docs/features/screen-host.md). Both share one MaturityProvider (Session), fed by
// whichever screen's core slice lands; a gap picked or sent on the crag is the same gap on a stage page, and a send's
// answer reaches the session after its screen left. The crag's geometry, the stage names, the crag modes and the stepper
// are static: they paint in the click's frame.
// Reveal order, /maturity:
//   0  window chrome, toolbar (modes, stepper, scan meta with dashes), backdrop   at once
//   1  sidebar stages (rungs)                                                    core
//   2  crag routes                                                               core
//   3  gaps table                                                                core
// Reveal order, /maturity/[stage]:
//   0  window chrome, back link, title (the URL's stage)                         at once
//   1  the stage's cards, lede, status                                           core
import { useLayoutEffect } from 'react';
import { useSlice, type ScreenDef, type ScreenFrameProps } from '@/components/shell/host';
import type { Stage } from '@/schemas';
import { STAGES } from '@/schemas/stages';
import { StageNotFound } from '../components/pending/MaturityPending';
import type { MaturityInput } from '../hooks/useMaturity';
import { MaturityScreen } from '../MaturityScreen';
import { MaturitySession, useMaturityShared } from '../MaturityProvider';
import { StageScreen } from '../StageScreen';

/** Hands the screen's core slice to the session before paint (no frame shows the slice landed but the screen unread). */
function useCore(): string | undefined {
  const core = useSlice<MaturityInput>('core');
  const { arrive } = useMaturityShared();
  useLayoutEffect(() => {
    if (core.state === 'ok') arrive(core.data);
  }, [core, arrive]);
  return core.state === 'error' ? core.reason : undefined;
}

function MaturityFrame() {
  return <MaturityScreen coreError={useCore()} />;
}

const isStage = (s: string | undefined): s is Stage => (STAGES as readonly string[]).includes(s ?? '');

function StageFrame({ params }: ScreenFrameProps) {
  const coreError = useCore();
  const stage = params.stage;
  // the nine stages are static: an unknown one is not found at once, before the stream says so
  return isStage(stage) ? <StageScreen stage={stage} coreError={coreError} /> : <StageNotFound />;
}

export const screens: readonly ScreenDef[] = [
  { key: 'maturity', ready: true, slices: ['core'], Frame: MaturityFrame, Session: MaturitySession, title: () => 'Afterlife · Maturity' },
  {
    key: 'maturity/[stage]',
    ready: true,
    slices: ['core'],
    Frame: StageFrame,
    Session: MaturitySession,
    NotFound: StageNotFound,
    title: (p) => `Afterlife · Maturity · ${p.stage}`,
  },
];
