import { InspectorSection } from '@/components/inspector/InspectorSection';
import { shortOf, whoOf } from '../../model/film/who';
import type { LedgerEntry, Marks } from '../../model/types';
import styles from './Inspector.module.css';

const BEFORE = 9;
const AFTER = 2;

/**
 * The ledger around the playhead, newest first: nine behind, two ahead (dimmed). A row cues that entry. A real film's
 * clock column is UTC (model/film/fromLedger.ts), so the header says so once; the illustrative clock is simulated, bare.
 */
export function LedgerSection({ i, entries, range, onSeek }: { i: number; entries: readonly LedgerEntry[]; range: Marks; onSeek: (i: number) => void }) {
  const rows = [];
  for (let k = Math.min(entries.length - 1, i + AFTER); k >= Math.max(0, i - BEFORE); k--) {
    const r = entries[k];
    if (r) rows.push({ k, r });
  }
  return (
    <InspectorSection title="Ledger" aux={`seq ${range.a}–${range.b}${entries[0]?.ev ? ' · UTC' : ''}`}>
      {rows.map(({ k, r }) => (
        <button
          key={r.seq}
          type="button"
          className={`${styles.lg} ${k === i ? styles.cur : ''} ${k > i ? styles.fut : ''}`}
          aria-current={k === i ? 'true' : undefined}
          title={`seq ${r.seq} · ${whoOf(r)} · ${r.x}`}
          onClick={() => onSeek(k)}
        >
          <span className={styles.tm}>{r.t}</span>
          <span className={styles.by}>{shortOf(r)}</span>
          <span className={styles.tx}>{r.x}</span>
        </button>
      ))}
    </InspectorSection>
  );
}
