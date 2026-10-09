import type { Snapshot } from '../../model/derive/snapshots';
import type { ReplayStore } from '../../model/replay/store';
import type { Film, TheaterDemo } from '../../model/types';
import { Rail } from '../rail/Rail';
import { Answers } from './Answers';
import { Pitch } from './Pitch';
import styles from './Stage.module.css';

/**
 * The stage: four answers across the top, the pitch on the left, the rail on the right. It fills whatever holds it:
 * the Window's content pane, or the full-viewport Present layer (`present` swaps in the viewport-scaled type).
 * On a real film (`demo` null) only what the ledger feeds is drawn.
 */
export function Stage({ snaps, snap, store, film, demo, present }: { snaps: readonly Snapshot[]; snap: Snapshot; store: ReplayStore; film: Film; demo: TheaterDemo | null; present: boolean }) {
  const prev = snaps[snap.i - 1];
  return (
    <div className={styles.stage} data-present={present ? '' : undefined}>
      <Answers snap={snap} prev={prev} demo={demo} />
      <Pitch snap={snap} snaps={snaps} store={store} film={film} demo={demo} />
      <Rail snap={snap} prev={prev} demo={demo} />
    </div>
  );
}
