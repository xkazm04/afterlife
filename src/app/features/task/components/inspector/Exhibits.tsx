import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TierChip } from '@/components/status/TierChip';
import { plural } from '@/lib/format/plural';
import { clockElapsed, exhibitKinds, isDenyPath } from '../../model/exhibits';
import type { TaskView } from '../../model/types';
import styles from './exhibits.module.css';

function HunkExhibit({ hunk }: { hunk: NonNullable<TaskView['hunk']> }) {
  return (
    <div className={styles.hunk}>
      <div className={styles.hh2}>
        <span>
          {hunk.file} {hunk.head}
        </span>
        <span className={styles.push}>
          <HonestyChip kind="seeded" />
        </span>
      </div>
      {hunk.lines.map(([mark, text], i) => (
        <div key={i} className={`${styles.hl} ${mark === '+' ? styles.add : ''}`}>
          <span>{mark}</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

function RerunExhibit({ stats }: { stats: NonNullable<TaskView['stats']> }) {
  return (
    <div className={styles.cells}>
      before{' '}
      {Array.from({ length: stats.failedBefore }, (_, i) => (
        <i key={`b${i}`} className={styles.c_bad}>
          ✗
        </i>
      ))}{' '}
      · reruns{' '}
      {Array.from({ length: stats.reruns }, (_, i) => (
        <i key={`r${i}`} className={i < stats.passed ? styles.c_ok : styles.c_bad}>
          {i < stats.passed ? '✓' : '✗'}
        </i>
      ))}
      <span className={styles.strong}>
        {stats.passed}/{stats.reruns} one SHA
      </span>
    </div>
  );
}

function ClockExhibit({ task, clock }: { task: TaskView; clock: NonNullable<TaskView['clock']> }) {
  return (
    <>
      <div className={styles.paths}>
        <span className={styles.due}>
          {clock.dueIn} left of {clock.total}
        </span>{' '}
        · {clock.kind} · aware {task.awareAt}
      </div>
      <div className={styles.cbar} aria-hidden="true">
        <b style={{ width: `${100 * clockElapsed(clock.dueIn, clock.total)}%` }} />
      </div>
      <div className={`${styles.paths} ${styles.wrap}`}>
        grade <b className={styles.strong}>{task.grade}</b> · links {task.linksResolved?.[0]}/{task.linksResolved?.[1]} · submit <TierChip tier="human_only" />
      </div>
    </>
  );
}

function EnvelopeExhibit({ task, e }: { task: TaskView; e: NonNullable<TaskView['envelope']> }) {
  return (
    <div className={styles.paths}>
      <span className={e.within ? styles.c_ok : styles.c_bad}>
        {plural(e.files, 'file')} · {plural(e.lines, 'line')} · {e.within ? 'inside' : 'outside'} envelope
      </span>
      {e.paths.map((p) => {
        const deny = isDenyPath(task, p);
        return (
          <div key={p} className={deny ? styles.deny : ''}>
            {deny ? '✗' : '✓'} {p}
            {deny ? ' · deny path' : ''}
          </div>
        );
      })}
    </div>
  );
}

/** What the proof class shows as exhibits: the quoted hunk, the reruns, the CRA clock, the diff envelope. */
export function Exhibits({ task }: { task: TaskView }) {
  const kinds = exhibitKinds(task);
  if (!kinds.length) return <div className={styles.muted}>Checks only</div>;
  return (
    <div className={styles.exhibits}>
      {kinds.map((k) => {
        if (k === 'hunk' && task.hunk) return <HunkExhibit key={k} hunk={task.hunk} />;
        if (k === 'reruns' && task.stats) return <RerunExhibit key={k} stats={task.stats} />;
        if (k === 'clock' && task.clock) return <ClockExhibit key={k} task={task} clock={task.clock} />;
        if (k === 'envelope' && task.envelope) return <EnvelopeExhibit key={k} task={task} e={task.envelope} />;
        return null;
      })}
    </div>
  );
}
