import { InspectorSection } from '@/components/inspector/InspectorSection';
import { shortOf } from '../../model/film/who';
import type { LedgerEntry, Marks } from '../../model/types';
import styles from './Inspector.module.css';

const BEFORE = 9;
const AFTER = 2;

/** The ledger around the playhead, newest first: nine behind, two ahead (dimmed). A row cues that entry. */
export function LedgerSection({ i, entries, range, onSeek }: { i: number; entries: readonly LedgerEntry[]; range: Marks; onSeek: (i: number) => void }) {
  const rows = [];
  for (let k = Math.min(entries.length - 1, i + AFTER); k >= Math.max(0, i - BEFORE); k--) {
    const r = entries[k];
    if (r) rows.push({ k, r });
  }
  return (
    <InspectorSection title="Ledger" aux={`seq ${range.a}–${range.b}`}>
      {rows.map(({ k, r }) => (
        <button
          key={r.seq}
          type="button"
          className={`${styles.lg} ${k === i ? styles.cur : ''} ${k > i ? styles.fut : ''}`}
          aria-current={k === i ? 'true' : undefined}
          title={`seq ${r.seq} · ${r.x}`}
          onClick={() => onSeek(k)}
        >
          <span className={styles.tm}>{r.t}</span>
          <span className={styles.by}>{shortOf(r.by)}</span>
          <span className={styles.tx}>{r.x}</span>
        </button>
      ))}
    </InspectorSection>
  );
}
