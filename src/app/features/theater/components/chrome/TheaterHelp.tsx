import { Kbd } from '@/components/controls/Kbd';
import { HonestyChip } from '@/components/status/HonestyChip';
import { KEYS } from '../../data/constants';
import { FIRST_SEQ, LAST_SEQ } from '../../model/replay/state';
import { ReplayChip } from '../parts/ReplayChip';
import styles from './TheaterHelp.module.css';

/** Behind the "?" in the status bar: the keys, and what the honesty marks on this screen mean. */
export function TheaterHelp() {
  return (
    <>
      <div className={styles.keys}>
        {KEYS.map(([k, v]) => [<Kbd key={`k-${k}`}>{k}</Kbd>, <span key={`v-${k}`}>{v}</span>])}
      </div>
      <hr className={styles.hr} />
      <div className={styles.marks}>
        <HonestyChip kind="seeded" />
        <span>Planted for the drill</span>
        <HonestyChip kind="simulated" />
        <span>Clock is not real</span>
        <ReplayChip from={FIRST_SEQ} to={LAST_SEQ} />
        <span>Recorded ledger slice</span>
      </div>
    </>
  );
}
