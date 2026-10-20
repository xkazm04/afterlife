'use client';

import { usePathname } from 'next/navigation';
import { openPalette } from '@/components/palette/CommandPalette';
import { useShellInfo } from '../ShellContext';
import { APP_NAV, activeNavKey } from './navItems';
import { NavLink } from './NavLink';
import { SidebarSection } from './SidebarSection';
import styles from './Sidebar.module.css';

/** The app screens; the current one comes from the route (usePathname). The ⌘K chip opens the command palette. */
export function AppNav() {
  const active = activeNavKey(usePathname());
  const { needsYouCount } = useShellInfo();
  return (
    <nav className={styles.appnav} aria-label="Afterlife">
      <SidebarSection
        title="Afterlife"
        aux={
          <button type="button" className={styles.goto} title="Go to anything (⌘K)" onClick={openPalette}>
            ⌘K
          </button>
        }
      >
        {APP_NAV.map((e) => (
          <NavLink key={e.key} entry={e} current={e.key === active} needsYou={needsYouCount} />
        ))}
      </SidebarSection>
    </nav>
  );
}
