import type { Snapshot } from '../../model/derive/snapshots';
import { seqRange, takeOfIndex } from '../../model/replay/state';
import type { ReplayStore } from '../../model/replay/store';
import type { Film, TheaterDemo } from '../../model/types';
import { ReplayChip } from '../parts/ReplayChip';
import { Wall } from '../wall/Wall';
import { Board } from './Board';
import styles from './Pitch.module.css';

/**
 * The pitch: the REPLAY chip and the beat line on top; the rope climb below, or the nine-stage wall at the close. The
 * chip reads the same in the window and in present: the illustrative slice's whole range, or the playing MR's.
 */
export function Pitch({ snap, snaps, store, film, demo }: { snap: Snapshot; snaps: readonly Snapshot[]; store: ReplayStore; film: Film; demo: TheaterDemo | null }) {
  const hold = snap.beat ? film.holds[snap.beat - 1] : undefined;
  const m44 = snap.e.sc === 'm44';
  const range = seqRange(film);
  const take = film.source === 'belay-ledger' ? film.takes[takeOfIndex(snap.i, film)] : undefined;
  const title = take
    ? 'A hold is lit only where a ledger event reached it · the others stay unclimbed'
    : m44
      ? '!41 holds at staging while !44 is caught on the next line'
      : 'The rope below is proven · the rope above is not yet climbed';
  return (
    <section className={styles.pitch} aria-label="The loop as a pitch: one change climbs from finding to summary" title={title}>
      <div className={styles.head}>
        <ReplayChip source={film.source} from={take?.a ?? range.a} to={take?.b ?? range.b} mr={take?.mr} />
        <span className={styles.beat}>
          beat <b>{snap.beat}</b> of 9 · {hold ? hold.label : 'on the ground'}
        </span>
      </div>
      {demo && snap.board ? <Board snap={snap} demo={demo} last={snap.e.seq === range.b} /> : <Wall store={store} snaps={snaps} film={film} quote={demo?.quote ?? ''} />}
    </section>
  );
}
