import { countLevels, countsText, type Level } from '../../model/rungs';
import styles from './StatusCounts.module.css';

/** The status bar line: how many of the nine stages are deep, running, configured, absent, unknown. */
export function StatusCounts({ levels }: { levels: readonly Level[] }) {
  const c = countLevels(levels);
  return (
    <>
      {countsText(c)}
      <span className={c.unknown ? styles.unknown : undefined}>{`${c.unknown} unknown`}</span>
    </>
  );
}
