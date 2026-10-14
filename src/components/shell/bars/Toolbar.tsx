import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

/**
 * The unified toolbar: the screen title and a dim subtitle, then the screen's controls (`children`), then `end`
 * (the Window puts the inspector toggle there). `lead` comes before the title (the Window puts the show-sidebar button there
 * while the sidebar is hidden). Use <Spacer /> inside children to push controls apart.
 */
export function Toolbar({ title, subtitle, lead, end, children }: { title: string; subtitle?: string; lead?: ReactNode; end?: ReactNode; children?: ReactNode }) {
  return (
    <header className={styles.tb}>
      {lead}
      <div className={styles.ttl}>
        <b>{title}</b>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {children}
      {end}
    </header>
  );
}
