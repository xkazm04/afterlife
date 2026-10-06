import type { Snapshot } from '../../model/derive/snapshots';
import { FIRST_SEQ, LAST_SEQ } from '../../model/replay/state';
import type { ReplayStore } from '../../model/replay/store';
import type { TheaterDemo } from '../../model/types';
import { ReplayChip } from '../parts/ReplayChip';
import { Wall } from '../wall/Wall';
import { Board } from './Board';
import styles from './Pitch.module.css';

/** The pitch: the REPLAY chip and the beat line on top; the rope climb below, or the nine-stage wall at the close. */
export function Pitch({ snap, snaps, store, demo, present }: { snap: Snapshot; snaps: readonly Snapshot[]; store: ReplayStore; demo: TheaterDemo; present: boolean }) {
  const hold = snap.beat ? demo.loop[snap.beat - 1] : undefined;
  const m44 = snap.e.sc === 'm44';
  return (
    <section
      className={styles.pitch}
      aria-label="The loop as a pitch: one change climbs from finding to summary"
      title={m44 ? '!41 holds at staging while !44 is caught on the next line' : 'The rope below is proven · the rope above is not yet climbed'}
    >
      <div className={styles.head}>
        <ReplayChip from={FIRST_SEQ} to={LAST_SEQ} note={present} />
        <span className={styles.beat}>
          beat <b>{snap.beat}</b> of 9 · {hold ? hold.label : 'on the ground'}
        </span>
      </div>
      {snap.board ? <Board snap={snap} demo={demo} /> : <Wall store={store} snaps={snaps} demo={demo} />}
    </section>
  );
}
