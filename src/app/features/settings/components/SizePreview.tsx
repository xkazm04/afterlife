import { KeyValue } from '@/components/inspector/KeyValue';
import { FeedAge } from '@/components/status/FeedAge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierChip } from '@/components/status/TierChip';
import styles from './SizePreview.module.css';

/** A table row, a tier chip and an inspector line drawn with the real parts, so they follow the chosen size. */
export function SizePreview() {
  return (
    <div className={styles.preview} aria-label="Preview">
      <div className={styles.table} role="presentation">
        <div className={`${styles.r} ${styles.head}`}>
          <span>Project</span>
          <span>State</span>
          <span>Tier</span>
          <span className={styles.rt}>Feed</span>
        </div>
        <div className={`${styles.r} ${styles.sel}`}>
          <span>ledgerline</span>
          <span>
            <StateGlyph state="watching" />
          </span>
          <span>
            <TierChip tier="supervised" />
          </span>
          <span className={styles.rt}>
            <FeedAge ageSec={12} ok />
          </span>
        </div>
        <div className={styles.r}>
          <span>ingest-api</span>
          <span>
            <StateGlyph state="stale" />
          </span>
          <span>
            <TierChip tier="quarantined" />
          </span>
          <span className={styles.rt}>
            <FeedAge ageSec={2400} ok={false} error="poll failed" />
          </span>
        </div>
      </div>
      <div className={styles.insp}>
        <KeyValue
          rows={[
            ['Last poll', '12 s ago'],
            ['Status', 'ok'],
          ]}
        />
      </div>
    </div>
  );
}
