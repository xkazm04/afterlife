import { InspectorSection } from '@/components/inspector/InspectorSection';
import { BY_SHORT } from '../../data/constants';
import { REPLAY_LEDGER } from '../../data/ledger';
import { FIRST_SEQ, LAST_SEQ, N } from '../../model/replay/state';
import styles from './Inspector.module.css';

const BEFORE = 9;
const AFTER = 2;

/** The ledger around the playhead, newest first: nine behind, two ahead (dimmed). A row cues that entry. */
export function LedgerSection({ i, onSeek }: { i: number; onSeek: (i: number) => void }) {
  const rows = [];
  for (let k = Math.min(N - 1, i + AFTER); k >= Math.max(0, i - BEFORE); k--) {
    const r = REPLAY_LEDGER[k];
    if (r) rows.push({ k, r });
  }
  return (
    <InspectorSection title="Ledger" aux={`seq ${FIRST_SEQ}–${LAST_SEQ}`}>
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
          <span className={styles.by}>{BY_SHORT[r.by] ?? r.by}</span>
          <span className={styles.tx}>{r.x}</span>
        </button>
      ))}
    </InspectorSection>
  );
}
