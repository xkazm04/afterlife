'use client';

import { Kbd } from '@/components/controls/Kbd';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { Stepper } from '@/components/controls/toolbar/Stepper';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import { Reveal, Unread, useHostNav } from '@/components/shell/host';
import type { Stage } from '@/schemas';
import { StatusCounts } from './components/chrome/StatusCounts';
import { StageDetail } from './components/inspector/StageDetail';
import inspector from './components/inspector/inspector.module.css';
import { MaturityLegend } from './components/legend/MaturityLegend';
import { StagePending, StatusPending } from './components/pending/MaturityPending';
import { projectLabel } from './data/meta';
import { stagePath, useStepNav } from './hooks/useStepNav';
import { useMaturityShared } from './MaturityProvider';
import { stageLede } from './model/flow/lede';
import { capsFor } from './model/keys/keymap';
import { capitalize } from './model/rungs';
import { STEP_NAMES } from './model/steps';

const STEPS_UNREAD = STEP_NAMES.map((s) => ({ ...s, enabled: false, current: s.k === 1, past: false, count: null, loud: s.k === 3 }));

/**
 * /maturity/[stage]: one DevSecOps stage on its own page, in place of the Maturity inspector drawer. The title and the
 * back link paint at once (the stage is the URL's); its cards and the lede wait for the read with dashes.
 */
export function StageScreen({ stage, coreError }: { stage: Stage; coreError?: string }) {
  const { api, project = '' } = useMaturityShared();
  const { navigate } = useHostNav();
  const onGo = useStepNav(api, 'page');
  const gap = api?.ctx.gapByStage(stage);
  const previewing = !!api && api.state.step === 2 && api.pending.length > 0;
  return (
    <DetailPage
      parent={{ label: 'Maturity', href: '/maturity' }}
      title={capitalize(stage)}
      lede={api ? stageLede(api.ctx, api.state, stage) : <Unread label="stage not read yet" />}
      subtitle={api ? projectLabel(api.ctx, project) : '—'}
      toolbar={<Stepper steps={api?.steps ?? STEPS_UNREAD} onGo={onGo} label="Next move" />}
      help={<MaturityLegend />}
      helpTitle="Legend"
      status={
        api ? (
          <>
            <StatusCounts levels={api.routes.map((r) => r.lv)} /> · {api.ctx.scanned ? `scanned ${api.state.scannedAt}` : 'not scanned'} · engine {api.ctx.engine}
          </>
        ) : (
          <StatusPending />
        )
      }
    >
      {previewing && api ? (
        <div className={inspector.pv}>
          <span>Preview</span>
          <SegmentedControl
            label="Picked gaps"
            options={api.pending.map((id) => ({ value: id, label: id }))}
            value={gap?.id ?? ''}
            onChange={(id) => {
              api.dispatch({ type: 'preview', id });
              const to = api.ctx.gap(id)?.stage;
              if (to) navigate(stagePath(to));
            }}
          />
          <Kbd>{capsFor('move').slice(0, 2).join(' ')}</Kbd>
        </div>
      ) : null}
      <Reveal order={1} slice="core" className={inspector.cards}>
        {api ? <StageDetail api={api} stage={stage} /> : <StagePending reason={coreError} />}
      </Reveal>
    </DetailPage>
  );
}
