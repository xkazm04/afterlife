'use client';

import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { Kbd } from '@/components/controls/Kbd';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { nextOf, capitalize, rungText } from '../../model/rungs';
import type { MaturityApi } from '../../hooks/useMaturity';
import { CreditHistory } from './CreditHistory';
import { EvidenceSection } from './EvidenceSection';
import { GapSection } from './gap/GapSection';
import styles from './inspector.module.css';
import { Chip } from '@/components/status/chip/Chip';

/** Layer 2 for the selected stage: evidence per rung, its gap (diff, then the after-merge checks), day 0, credit history. */
export function InspectorPanel({ api }: { api: MaturityApi }) {
  const { ctx, state, pending, dispatch } = api;
  const stage = state.sel;
  const base = ctx.base[stage];
  const now = state.now[stage];
  const nx = nextOf(now, base.next);
  const gap = ctx.gapByStage(stage);
  const section = (key: 'ev' | 'gap' | 'day0' | 'hist') => (open: boolean) => dispatch({ type: 'section', key, open });
  const history = [...ctx.credit.filter((c) => c.stage === stage), ...state.log.filter((c) => c.stage === stage)];
  const previewing = state.step === 2 && pending.length > 0;

  return (
    <>
      {previewing ? (
        <div className={styles.pv}>
          <span>Preview</span>
          <SegmentedControl
            label="Picked gaps"
            options={pending.map((id) => ({ value: id, label: id }))}
            value={gap?.id ?? ''}
            onChange={(id) => dispatch({ type: 'preview', id })}
          />
          <Kbd>← →</Kbd>
        </div>
      ) : null}
      <InspectorHeader
        title={
          <>
            {capitalize(stage)}
            <Chip tone={now != null && now >= 3 ? 'ok' : 'neutral'} push>
              {`${rungText(now)} ${now != null ? (ctx.rungNames[now] ?? '') : 'unknown'}`}
            </Chip>
          </>
        }
        sub={`day 0 ${rungText(base.day0)} · now ${rungText(now)} · next ${now != null && nx <= now ? '—' : rungText(nx)}`}
        path={`scan ${state.scannedAt} · engine ${ctx.engine}`}
      />
      <EvidenceSection ctx={ctx} stage={stage} now={now} open={state.open.ev} onOpenChange={section('ev')} />
      {gap ? (
        <GapSection ctx={ctx} state={state} gap={gap} dispatch={dispatch} />
      ) : (
        <InspectorSection title="Gap" aux="—" open={state.open.gap} onOpenChange={section('gap')}>
          <div className={styles.muted}>No gap proposed for this stage.</div>
        </InspectorSection>
      )}
      <InspectorSection title="Day 0" aux={rungText(base.day0)} open={state.open.day0} onOpenChange={section('day0')}>
        <div className={styles.muted}>{ctx.evidence[stage].day0}</div>
      </InspectorSection>
      <CreditHistory rows={history} engine={ctx.engine} open={state.open.hist} onOpenChange={section('hist')} />
    </>
  );
}
