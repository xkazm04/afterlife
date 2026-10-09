import { memo } from 'react';
import { demotionWord, deriveAnswers, needsIncreased } from '../../model/derive/answers';
import type { Snapshot } from '../../model/derive/snapshots';
import type { TheaterDemo } from '../../model/types';
import { Card } from '@/components/surface/Card';
import styles from './Answers.module.css';

/**
 * Running / Doing now / Going well / Needs me, all derived from the snapshot at the playhead. On a real film (`demo`
 * null) only Doing now: the ledger states no armed tracks, no week's counts and no waiting items.
 */
export const Answers = memo(function Answers({ snap, prev, demo }: { snap: Snapshot; prev?: Snapshot; demo: TheaterDemo | null }) {
  const a = deriveAnswers(snap, demo?.tracksArmed ?? 0, demo?.tracksTotal ?? 0);
  const bump = needsIncreased(prev, snap);
  const now = (
    <Card className={`${styles.ans} ${styles.now}`}>
      <span className={styles.al}>Doing now</span>
      <span className={styles.av} title={a.now}>
        {a.now}
      </span>
    </Card>
  );
  if (!demo) {
    return (
      <section className={styles.answers} aria-label="Doing now" aria-live="polite">
        {now}
      </section>
    );
  }
  return (
    <section className={styles.answers} aria-label="Four answers" aria-live="polite">
      <Card className={styles.ans} title="Tracks armed, in the demo catalogue">
        <span className={styles.al}>Running</span>
        <span className={styles.av}>
          <b>{a.running.armed}</b>
          <small>/ {a.running.total} tracks</small>
        </span>
      </Card>
      {now}
      <Card className={styles.ans} title="This week · counts only">
        <span className={styles.al}>Going well</span>
        <span className={styles.av}>
          <b className={styles.ok}>{a.well.pass}</b>
          <small>pass</small>
          <b className={a.well.fail ? styles.bad : undefined}>{a.well.fail}</b>
          <small>fail</small>
          <b>{a.well.demotions}</b>
          <small>{demotionWord(a.well.demotions)}</small>
        </span>
      </Card>
      <Card
        key={bump ? snap.i : 'steady'}
        className={`${styles.ans} ${styles.need} ${bump ? styles.bump : ''}`}
        title={`Latest: ${a.needs.latest}`}
      >
        <span className={styles.al}>Needs me</span>
        <span className={styles.av}>
          <b>{a.needs.count}</b>
          <small>oldest {a.needs.oldest}</small>
        </span>
      </Card>
    </section>
  );
});
