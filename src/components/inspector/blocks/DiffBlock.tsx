import type { DiffLine } from './diff';
import styles from './DiffBlock.module.css';

/**
 * The exact change a click will write: the file name, then the diff lines (green added, red removed, dim context).
 * Build `lines` with parseDiff() from "+ x" strings, or pass [mark, text] pairs.
 */
export function DiffBlock({ file, lines, label = 'diff' }: { file?: string; lines: readonly DiffLine[]; label?: string }) {
  return (
    <div className={styles.diff} role="group" aria-label={label}>
      {file ? <div className={styles.file}>{file}</div> : null}
      {lines.map(([mark, text], i) => (
        <div key={i} className={mark === '+' ? styles.add : mark === '-' ? styles.del : undefined}>
          {mark} {text}
        </div>
      ))}
    </div>
  );
}
