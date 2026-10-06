import type { ReactNode } from 'react';
import type { CheckKind } from '../model/types';
import styles from './StatusTag.module.css';

/** The small outlined tag on a claim or check: green holds, red fails, dashed unknown. The glyph in it carries the meaning too. */
export function StatusTag({ kind, children }: { kind: CheckKind; children: ReactNode }) {
  return <span className={`${styles.st} ${styles[kind]}`}>{children}</span>;
}
