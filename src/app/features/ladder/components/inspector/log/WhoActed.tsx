import { timedEntries } from '../../../model/view/moves';
import type { LedgerEntry } from '../../../model/types';
import { Axis } from './Axis';
import { LogItem } from './LogItem';
import styles from './log.module.css';

/** The to-scale axis (two or more timed events) over the entries, oldest first. `empty` says what to show with none. */
export function WhoActed({ entries, empty }: { entries: readonly LedgerEntry[]; empty: string }) {
  const timed = timedEntries(entries);
  return (
    <>
      {timed.length >= 2 ? <Axis events={timed} /> : null}
      {entries.length ? entries.map((e, i) => <LogItem key={i} entry={e} />) : <div className={styles.empty}>{empty}</div>}
    </>
  );
}
