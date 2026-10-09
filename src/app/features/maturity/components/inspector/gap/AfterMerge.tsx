import { Button } from '@/components/controls/Button';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { MaturityCtx, Gap } from '../../../model/ctx';
import { creditChecks, timeline, type Phase } from '../../../model/flow/credit';
import type { Action } from '../../../model/reducer';
import { rungText, type Level } from '../../../model/rungs';
import { cx } from '../../cx';
import { Chip } from '@/components/status/chip/Chip';
import styles from './gap.module.css';

const MARK = { ok: ['✓', styles.mok], no: ['✗', styles.mno], q: ['·', styles.mq] } as const;

/**
 * What happens after you merge, simulated step by step: opened → merged → (ran) → rescan → credit. Merging a job
 * that has not run is "no lift: configured, not exercised"; credit needs the job to run first.
 */
export function AfterMerge({ ctx, gap, phase, now, mr, dispatch }: { ctx: MaturityCtx; gap: Gap; phase: Phase; now: Level; mr: string; dispatch: (a: Action) => void }) {
  const x = gap.x;
  const id = gap.id;
  if (x.kind === 'probe') {
    return (
      <>
        <div className={styles.chk}>
          <span className={cx(styles.m, styles.mq)}>?</span>
          <span>{x.probeResult}</span>
        </div>
        <HonestyChip kind="simulated" />
        <Chip tone="neutral">{`no rung change · ${gap.stage} stays ${rungText(now)}`}</Chip>
      </>
    );
  }
  const decided = phase === 'nolift' || phase === 'credited';
  return (
    <>
      <div className={styles.gh}>
        <span className={styles.mr}>{mr}</span>
        <span className={styles.branch}>{x.branch}</span>
      </div>
      <div className={styles.tl}>
        {timeline(phase, x.needsRun).map((t) => (
          <span key={t.name} className={t.state === 'todo' ? undefined : styles[t.state]}>
            <i />
            {t.name}
          </span>
        ))}
      </div>
      {decided ? (
        <>
          <div className={styles.chk}>
            {creditChecks(x.needsRun, phase).map((c) => (
              <ChecksRow key={c.text} mark={c.mark} text={c.text} />
            ))}
          </div>
          {phase === 'credited' ? (
            <Chip tone="ok">{`credited · ${gap.stage} ${rungText(gap.from)} → ${rungText(gap.to)}`}</Chip>
          ) : (
            <Chip tone="neutral">{`no lift · ${gap.stage} stays ${rungText(gap.from)}`}</Chip>
          )}
        </>
      ) : null}
      <div className={styles.acts}>
        {phase === 'opened' ? (
          <>
            <Button onClick={() => dispatch({ type: 'merge', id })}>Merge in GitLab</Button>
            <HonestyChip kind="simulated" />
          </>
        ) : null}
        {phase === 'merged' || phase === 'ran' ? (
          <>
            <Button variant="accent" title={`Rescan, engine ${ctx.engine} · read only (simulated)`} onClick={() => dispatch({ type: 'rescanGap', id })}>
              {`Rescan · engine ${ctx.engine}`}
            </Button>
            <HonestyChip kind="simulated" />
          </>
        ) : null}
        {phase === 'nolift' ? (
          <>
            <Button onClick={() => dispatch({ type: 'ran', id })}>{x.runsOn === 'tag' ? 'Tagged release runs' : 'Pipeline runs on main'}</Button>
            <HonestyChip kind="simulated" />
          </>
        ) : null}
      </div>
    </>
  );
}

function ChecksRow({ mark, text }: { mark: keyof typeof MARK; text: string }) {
  const [glyph, cls] = MARK[mark];
  return (
    <>
      <span className={cx(styles.m, cls)}>{glyph}</span>
      <span>{text}</span>
    </>
  );
}
