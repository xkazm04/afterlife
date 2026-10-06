import type { DiffFile } from '../../../data/types';
import { cx } from '../../cx';
import styles from './gap.module.css';

const added = (f: DiffFile): number => f.lines.filter((l) => l.startsWith('+')).length;

/** The gap's diff: file tabs when it touches more than one file, then the lines, additions tinted. */
export function DiffView({ files, index, onTab }: { files: readonly DiffFile[]; index: number; onTab: (i: number) => void }) {
  const at = Math.min(index, files.length - 1);
  const f = files[at];
  if (!f) return null;
  return (
    <>
      {files.length > 1 ? (
        <div className={styles.ftabs} role="tablist" aria-label="Files in this gap">
          {files.map((ff, k) => (
            <button key={ff.path} type="button" role="tab" aria-selected={k === at} title={ff.path} onClick={() => onTab(k)}>
              {ff.path.split('/').pop()}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.diff}>
        <div className={styles.fh}>
          <span>{f.path}</span>
          <span className={styles.aux}>{`${f.isNew ? 'new · ' : ''}+${added(f)} −0`}</span>
        </div>
        <pre>
          {f.lines.map((l, i) => (
            <span key={i} className={cx(styles.ln, l.startsWith('+') && styles.add)}>
              {l}
            </span>
          ))}
        </pre>
      </div>
    </>
  );
}
