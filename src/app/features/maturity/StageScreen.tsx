'use client';

import { useRouter } from 'next/navigation';
import { Kbd } from '@/components/controls/Kbd';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { Stepper } from '@/components/controls/toolbar/Stepper';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import type { Stage } from '@/schemas';
import { StatusCounts } from './components/chrome/StatusCounts';
import { StageDetail } from './components/inspector/StageDetail';
import inspector from './components/inspector/inspector.module.css';
import { MaturityLegend } from './components/legend/MaturityLegend';
import { projectLabel } from './data/meta';
import { stagePath, useStepNav } from './hooks/useStepNav';
import { useMaturityShared } from './MaturityProvider';
import { stageLede } from './model/flow/lede';
import { capitalize } from './model/rungs';

/** /maturity/[stage]: one DevSecOps stage on its own page, in place of the Maturity inspector drawer. */
export function StageScreen({ stage }: { stage: Stage }) {
  const { api, project } = useMaturityShared();
  const router = useRouter();
  const { ctx, state, dispatch, routes, steps, pending } = api;
  const onGo = useStepNav(api, 'page');
  const gap = ctx.gapByStage(stage);
  const previewing = state.step === 2 && pending.length > 0;
  return (
    <DetailPage
      parent={{ label: 'Maturity', href: '/maturity' }}
      title={capitalize(stage)}
      lede={stageLede(ctx, state, stage)}
      subtitle={projectLabel(ctx, project)}
      toolbar={<Stepper steps={steps} onGo={onGo} label="Next move" />}
      help={<MaturityLegend />}
      helpTitle="Legend"
      status={
        <>
          <StatusCounts levels={routes.map((r) => r.lv)} /> · {ctx.scanned ? `scanned ${state.scannedAt}` : 'not scanned'} · engine {ctx.engine}
        </>
      }
    >
      {previewing ? (
        <div className={inspector.pv}>
          <span>Preview</span>
          <SegmentedControl
            label="Picked gaps"
            options={pending.map((id) => ({ value: id, label: id }))}
            value={gap?.id ?? ''}
            onChange={(id) => {
              dispatch({ type: 'preview', id });
              const to = ctx.gap(id)?.stage;
              if (to) router.push(stagePath(to));
            }}
          />
          <Kbd>← →</Kbd>
        </div>
      ) : null}
      <StageDetail api={api} stage={stage} />
    </DetailPage>
  );
}
