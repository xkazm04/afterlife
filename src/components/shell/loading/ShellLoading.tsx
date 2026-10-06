'use client';

import { usePathname } from 'next/navigation';
import { Window } from '../Window';
import { APP_NAV, SETTINGS_NAV, activeNavKey } from '../sidebar/navItems';
import styles from './ShellLoading.module.css';

/**
 * The window frame while a screen's data streams in (the root loading.tsx). The sidebar, toolbar and status bar are the
 * real ones, titled from the route, so the frame appears at once and the screen fills it in place.
 */
export function ShellLoading() {
  const key = activeNavKey(usePathname());
  const title = [...APP_NAV, SETTINGS_NAV].find((e) => e.key === key)?.label ?? 'Afterlife';
  return (
    <Window title={title} subtitle="loading" status="Loading…">
      <div className={styles.pane} aria-busy="true" aria-label={`Loading ${title}`}>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={styles.row} style={{ width: `${92 - ((i * 37) % 40)}%` }} />
        ))}
      </div>
    </Window>
  );
}
