import type { ActorKind, LedgerEntry } from '../../../model/types';
import { ALL_KINDS, KIND_LABELS, filterByKinds } from '../../../model/view/moves';
import { LogItem } from '../log/LogItem';
import { Sec, type SectionState } from '../Sec';
import styles from './sections.module.css';

/** Every move in the ledger, newest first, with a toggle per actor. Moves of other classes are dimmed. */
export function AllMoves({
  ledger,
  current,
  kinds,
  onToggleKind,
  sections,
}: {
  ledger: readonly LedgerEntry[];
  current: string;
  kinds: readonly ActorKind[];
  onToggleKind: (kind: ActorKind) => void;
  sections: SectionState;
}) {
  const list = filterByKinds(ledger, kinds);
  return (
    <Sec id="all" title="All moves" aux={`${list.length} of ${ledger.length}`} defaultOpen={false} sections={sections}>
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
