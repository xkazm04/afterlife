import type { HTMLAttributes } from 'react';
import styles from './table.module.css';

/**
 * One grid cell of a row. `align` positions its content; `indent` is the first column's tree indent (24px grouped,
 * 8px flat). `data` marks a body cell that gets the stale hatch when its row is stale. Cells clip overflow, so long
 * text needs a title.
 */
export function Cell({
  align = 'start',
  indent,
  data,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end'; indent?: boolean; data?: boolean }) {
  const cls = [styles.c, align === 'center' ? styles.ctr : align === 'end' ? styles.rt : '', indent ? styles.indent : '', data ? styles.d : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return <div role="gridcell" className={cls} {...rest} />;
}
