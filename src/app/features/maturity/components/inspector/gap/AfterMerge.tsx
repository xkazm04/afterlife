import { Button } from '@/components/controls/Button';
import { HonestyChip } from '@/components/status/HonestyChip';
import type { MaturityCtx, Gap } from '../../../model/ctx';
import { creditChecks, timeline, type Phase } from '../../../model/flow/credit';
import type { Action } from '../../../model/reducer';
import { rungText, type Level } from '../../../model/rungs';
import { cx } from '../../cx';
import { Verdict } from '../Verdict';
import styles from './gap.module.css';

const MARK = { ok: ['✓', styles.mok], no: ['✗', styles.mno], q: ['·', styles.mq] } as const;

/**
 * What happens after you merge, simulated step by step: opened → merged → (ran) → rescan → credit. Merging a job
 * that has not run is "no lift: configured, not exercised"; credit needs the job to run first.
 */
export function AfterMerge({ ctx, gap, phase, now, dispatch }: { ctx: MaturityCtx; gap: Gap; phase: Phase; now: Level; dispatch: (a: Action) => void }) {
  const x = gap.x;
  const id = gap.id;
  if (x.kind === 'probe') {
    return (
      <>
        <div className={styles.chk}>
          <span className={cx(styles.m, styles.mq)}>?</span>
          <span>{x.probeResult}</span>
        </div>
        <Verdict ok={false}>{`no rung change · ${gap.stage} stays ${rungText(now)}`}</Verdict>
      </>
    );
  }
  const decided = phase === 'nolift' || phase === 'credited';
  return (
    <>
      <div className={styles.gh}>
        <span className={styles.mr}>{x.mrId}</span>
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
            {creditChecks(ctx.engine, x.needsRun, phase).map((c) => (
              <ChecksRow key={c.text} mark={c.mark} text={c.text} />
            ))}
          </div>
          {phase === 'credited' ? (
            <Verdict ok>{`credited · ${gap.stage} ${rungText(gap.from)} → ${rungText(gap.to)}`}</Verdict>
          ) : (
            <Verdict ok={false}>{`no lift · ${gap.stage} stays ${rungText(gap.from)}`}</Verdict>
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
          <Button variant="accent" title={`npx belay scan --engine ${ctx.engine} · read only`} onClick={() => dispatch({ type: 'rescanGap', id })}>
            {`Rescan · engine ${ctx.engine}`}
          </Button>
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
