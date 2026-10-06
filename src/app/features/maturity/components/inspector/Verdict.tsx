// kit-candidate: Verdict - the `.vd` verdict chip (ok = credited / deep, no = no lift / below).
import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Verdict.module.css';

export function Verdict({ ok, push, children }: { ok: boolean; /** Push it to the right edge of a flex row. */ push?: boolean; children: ReactNode }) {
  return <span className={cx(styles.vd, ok ? styles.ok : styles.no, push && styles.push)}>{children}</span>;
}
