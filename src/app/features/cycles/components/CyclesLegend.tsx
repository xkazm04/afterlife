import { Legend } from '@/components/overlays/popover/Legend';
import styles from './chrome.module.css';

/** The "?" legend: how to read the grid. */
export function CyclesLegend() {
  return (
    <Legend
      rows={[
        [<span key="r" className={styles.lg} data-r="3">3</span>, 'A stage after a cycle: its rung, R0 to R4 (the brighter, the higher)'],
        [<span key="u" className={styles.lg} data-m="up">2</span>, 'Lifted this cycle: a same-engine rescan credited it'],
        [<span key="d" className={styles.lg} data-m="down">2</span>, 'Drift: the rescan found it lower; it is written into the cycle, never hidden'],
        [<span key="t" className={styles.lg} data-m="tried">0</span>, 'Ring: a change was tried and did not earn the rung; it carries forward'],
        [<span key="g" className={styles.lg} data-m="ghost">→4</span>, 'Running and planned cycles: the rung a picked or proposed change aims for'],
        [<span key="q" className={styles.lg} data-r="q">?</span>, 'Unknown: never probed. Unknown is never zero'],
        ['← →', 'Walk the cycles · Home and End jump to the first and the planned one'],
      ]}
    />
  );
}
