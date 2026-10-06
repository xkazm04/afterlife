import type { Snapshot } from '../../model/derive/snapshots';
import type { ReplayStore } from '../../model/replay/store';
import type { TheaterDemo } from '../../model/types';
import { Rail } from '../rail/Rail';
import { Answers } from './Answers';
import { Pitch } from './Pitch';
import styles from './Stage.module.css';

/**
 * The stage: four answers across the top, the pitch on the left, the rail on the right. It fills whatever holds it:
 * the Window's content pane, or the full-viewport Present layer (`present` swaps in the viewport-scaled type).
 */
export function Stage({ snaps, snap, store, demo, present }: { snaps: readonly Snapshot[]; snap: Snapshot; store: ReplayStore; demo: TheaterDemo; present: boolean }) {
  const prev = snaps[snap.i - 1];
  return (
    <div className={styles.stage} data-present={present ? '' : undefined}>
      <Answers snap={snap} prev={prev} armed={demo.tracksArmed} total={demo.tracksTotal} />
      <Pitch snap={snap} snaps={snaps} store={store} demo={demo} present={present} />
      <Rail snap={snap} prev={prev} demo={demo} />
    </div>
  );
}
