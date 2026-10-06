import { memo } from 'react';
import { demotionWord, deriveAnswers, needsIncreased } from '../../model/derive/answers';
import type { Snapshot } from '../../model/derive/snapshots';
import { Card } from '@/components/surface/Card';
import styles from './Answers.module.css';

/** Running / Doing now / Going well / Needs me, all derived from the snapshot at the playhead. */
export const Answers = memo(function Answers({ snap, prev, armed, total }: { snap: Snapshot; prev?: Snapshot; armed: number; total: number }) {
  const a = deriveAnswers(snap, armed, total);
  const bump = needsIncreased(prev, snap);
  return (
    <section className={styles.answers} aria-label="Four answers" aria-live="polite">
      <Card className={styles.ans} title="Tracks armed, as recorded">
        <span className={styles.al}>Running</span>
        <span className={styles.av}>
          <b>{a.running.armed}</b>
          <small>/ {a.running.total} tracks</small>
        </span>
      </Card>
      <Card className={`${styles.ans} ${styles.now}`}>
        <span className={styles.al}>Doing now</span>
        <span className={styles.av} title={a.now}>
          {a.now}
        </span>
      </Card>
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
