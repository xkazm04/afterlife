import { formatAge } from '@/lib/format/time';
import styles from './status.module.css';

/**
 * How old the last poll is. Never polled is a dim dash, a failing feed is amber and bold (stale), otherwise plain.
 * `ok: null` with an age means "unknown health": drawn plain, never green.
 */
export function FeedAge({ ageSec, ok, error }: { ageSec: number | null; ok: boolean | null; error?: string }) {
  if (ageSec == null) {
    return (
      <span className={`${styles.fa} ${styles.never}`} title="never polled">
        —
      </span>
    );
  }
  if (ok === false) {
    return (
      <span className={`${styles.fa} ${styles.failing}`} title={error ?? 'stale'}>
        {formatAge(ageSec)}
      </span>
    );
  }
  return <span className={styles.fa}>{formatAge(ageSec)}</span>;
}
