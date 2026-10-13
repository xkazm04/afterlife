import type { MarkKind } from '../../model/words';
import { MARK_LABEL } from '../../model/filter';
import styles from './filterchip.module.css';

/** The locked legend mark as a chip: what the city is filtered by, a way to let it go, and (stale) a way into its district. */
export function FilterChip({ kind, open, onClear, onOpen }: { kind: MarkKind | null; open: string | null; onClear: () => void; onOpen: () => void }) {
  if (!kind) return null;
  return (
    <div className={styles.chip} data-role="door-filter" role="group" aria-label={`Filter: ${MARK_LABEL[kind]}`}>
      <button type="button" className={styles.clear} onClick={onClear} aria-label={`Clear filter ${MARK_LABEL[kind]}`}>
        Filter: <b>{MARK_LABEL[kind]}</b>
        <span aria-hidden> ✕</span>
      </button>
      {open ? (
        <button type="button" className={styles.open} onClick={onOpen}>
          Open {open}
        </button>
      ) : null}
    </div>
  );
}
