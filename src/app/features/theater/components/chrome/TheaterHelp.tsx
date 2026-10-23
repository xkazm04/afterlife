import { Kbd } from '@/components/controls/Kbd';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { keysFor } from '../../data/constants';
import { seqRange } from '../../model/replay/state';
import type { Film } from '../../model/types';
import { ReplayChip } from '../parts/ReplayChip';
import styles from './TheaterHelp.module.css';

/**
 * Behind the "?" in the status bar: the keys, and what the honesty marks on this screen mean - only the marks this film
 * draws. SEEDED rides a seeded entry or take; SIMULATED rides the CRA clock, which only the illustrative film draws.
 */
export function TheaterHelp({ film }: { film: Film }) {
  const range = seqRange(film);
  const seeded = film.entries.some((e) => e.seeded) || film.takes.some((t) => t.seeded);
  const simulated = film.source === 'illustrative';
  return (
    <>
      <div className={styles.keys}>
        {keysFor(film.takes.length).map(([k, v]) => [<Kbd key={`k-${k}`}>{k}</Kbd>, <span key={`v-${k}`}>{v}</span>])}
      </div>
      <hr className={styles.hr} />
      <div className={styles.marks}>
        {seeded ? [<HonestyChip key="seeded" kind="seeded" />, <span key="seeded-why">Planted for the drill</span>] : null}
        {simulated ? [<HonestyChip key="simulated" kind="simulated" />, <span key="simulated-why">Clock is not real</span>] : null}
        <ReplayChip source={film.source} from={range.a} to={range.b} />
        <span>{film.source === 'illustrative' ? 'Illustrative ledger slice: invented for the demo, no run behind it' : "Read from belay-ledger: the project's own hash-chained events"}</span>
      </div>
    </>
  );
}
