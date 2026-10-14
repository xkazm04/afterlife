import type { ActorKind, LedgerEntry } from '../../../model/types';
import { ALL_KINDS, KIND_LABELS, filterByKinds } from '../../../model/view/moves';
import { LogItem } from '../log/LogItem';
import { Sec } from '../Sec';
import styles from './sections.module.css';

/** Every move in the ledger, newest first, with a toggle per actor. Moves of other classes are dimmed. */
export function AllMoves({
  ledger,
  current,
  kinds,
  onToggleKind,
}: {
  ledger: readonly LedgerEntry[];
  current: string;
  kinds: readonly ActorKind[];
  onToggleKind: (kind: ActorKind) => void;
}) {
  const list = filterByKinds(ledger, kinds);
  return (
    <Sec title="All moves" aux={`${list.length} of ${ledger.length}`} wide>
      <div className={styles.kinds}>
        {ALL_KINDS.map((k) => (
          <button key={k} type="button" className={`${styles.kb} ${styles[`k-${k}`]}`} aria-pressed={kinds.includes(k)} onClick={() => onToggleKind(k)}>
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      {list.length ? list.map((e, i) => <LogItem key={i} entry={e} dim={!e.ids.includes(current)} />) : <div className={styles.note}>No moves for these actors</div>}
    </Sec>
  );
}
