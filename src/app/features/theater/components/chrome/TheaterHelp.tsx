import { Kbd } from '@/components/controls/Kbd';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { KEYS } from '../../data/constants';
import { seqRange } from '../../model/replay/state';
import type { Film } from '../../model/types';
import { ReplayChip } from '../parts/ReplayChip';
import styles from './TheaterHelp.module.css';

/** Behind the "?" in the status bar: the keys, and what the honesty marks on this screen mean. */
export function TheaterHelp({ film }: { film: Film }) {
  const range = seqRange(film);
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
        <ReplayChip from={range.a} to={range.b} />
        <span>Recorded ledger slice</span>
      </div>
    </>
  );
}
