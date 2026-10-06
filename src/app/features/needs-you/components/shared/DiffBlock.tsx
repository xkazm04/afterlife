import type { DiffLine } from '../../data/types';
import styles from './DiffBlock.module.css';

// kit-candidate: DiffBlock, the file name plus +/- lines of the exact change a click will write.
export function DiffBlock({ file, diff }: { file?: string; diff: readonly DiffLine[] }) {
  return (
    <div className={styles.diff} role="group" aria-label="diff">
      {file ? <div className={styles.file}>{file}</div> : null}
      {diff.map(([mark, text], i) => (
        <div key={i} className={mark === '+' ? styles.add : mark === '-' ? styles.del : undefined}>
          {mark} {text}
        </div>
      ))}
    </div>
  );
}
