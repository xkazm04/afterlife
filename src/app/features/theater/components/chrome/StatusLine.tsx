import type { ReplayState } from '../../model/replay/state';
import { slateText } from '../../model/replay/state';
import styles from './StatusLine.module.css';

/** The status bar line: REPLAY · seq · clock · take n.m · in → out. */
export function StatusLine({ state }: { state: Pick<ReplayState, 'i' | 'take' | 'mark' | 'counts'> }) {
  return (
    <>
      <span className={styles.rp}>Replay</span> · {slateText(state)}
    </>
  );
}
