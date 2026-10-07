import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

/**
 * The unified toolbar: the screen title and a dim subtitle, then the screen's controls (`children`), then `end`
 * (the Window puts the inspector toggle there). Use <Spacer /> inside children to push controls apart.
 *
 * The toolbar is a size container named `toolbar`: kit controls fold their words away as it narrows (see the
 * `@container toolbar` rules), and if the controls still do not fit they are clipped, never `end`.
 */
export function Toolbar({ title, subtitle, end, children }: { title: string; subtitle?: string; end?: ReactNode; children?: ReactNode }) {
  return (
    <header className={styles.tb}>
      <div className={styles.ttl}>
        <b>{title}</b>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div className={styles.mid}>{children}</div>
      {end}
    </header>
  );
}
