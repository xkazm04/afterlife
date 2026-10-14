'use client';

import { DetailSection } from '@/components/shell/detail/DetailPage';
import type { Stage } from '@/schemas';
import type { MaturityApi } from '../../hooks/useMaturity';
import { rungText } from '../../model/rungs';
import { CreditHistory } from './CreditHistory';
import { EvidenceSection } from './EvidenceSection';
import { GapSection } from './gap/GapSection';
import styles from './inspector.module.css';

/** Live mode's Day 0: the rung of the first scan the index stored for the stage (no demo note stands in for it). */
function day0Live(ctx: MaturityApi['ctx'], day0: number | null): string {
  if (!ctx.scanned) return 'Not scanned yet: day 0 is the first scan Belay stores.';
  return day0 == null ? 'Unknown at the first scan Belay stored.' : `${rungText(day0)} ${ctx.rungNames[day0] ?? ''} at the first scan Belay stored.`;
}

/** The cards of a stage page: evidence per rung, its gap (diff, then the after-merge checks), day 0, credit history. */
export function StageDetail({ api, stage }: { api: MaturityApi; stage: Stage }) {
  const { ctx, state, dispatch } = api;
  const base = ctx.base[stage];
  const gap = ctx.gapByStage(stage);
  const past = ctx.credit.filter((c) => c.stage === stage);
  const session = state.log.filter((c) => c.stage === stage);
  return (
    <>
      <EvidenceSection ctx={ctx} stage={stage} now={state.now[stage]} />
      {gap ? (
        <GapSection ctx={ctx} state={state} gap={gap} dispatch={dispatch} />
      ) : (
        <DetailSection title="Gap" aux="—">
          <div className={styles.muted}>No gap proposed for this stage.</div>
        </DetailSection>
      )}
      <DetailSection title="Day 0" aux={rungText(base.day0)}>
        <div className={styles.muted}>{ctx.evidence ? ctx.evidence[stage].day0 : day0Live(ctx, base.day0)}</div>
      </DetailSection>
      <CreditHistory past={past} session={session} live={ctx.live} engine={ctx.engine} />
    </>
  );
}
