import { DetailSection } from '@/components/shell/detail/DetailPage';
import { stabilityLine, type Stability } from '@/lib/stability/stability';
import styles from '../sections.module.css';

/**
 * How stable this project's agent MRs were over the last 7 days (the DataSource's getStability: sizes and head pipelines
 * the poller reads, reverts from the tasks). Absent: not read, never zero. `demo`: the demo counts its own tasks only.
 */
export function StabilitySection({ s, demo }: { s: Stability | undefined; demo: boolean }) {
  return (
    <DetailSection title="Stability" aux="agent MRs · 7 days">
      {s ? <p className={styles.muted}>{stabilityLine(s)}</p> : <p className={styles.muted}>Not read: no poll has linked this project to GitLab yet.</p>}
      {demo && s ? <p className={styles.muted}>Demo: counted from the demo&apos;s tasks, which state no sizes, pipelines or dates.</p> : null}
    </DetailSection>
  );
}
