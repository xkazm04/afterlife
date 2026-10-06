'use client';

import { usePathname } from 'next/navigation';
import { useShellInfo } from '../ShellContext';
import { APP_NAV, activeNavKey } from './navItems';
import { NavLink } from './NavLink';
import { SidebarSection } from './SidebarSection';
import styles from './Sidebar.module.css';

/** The eight app screens; the current one comes from the route (usePathname). */
export function AppNav() {
  const active = activeNavKey(usePathname());
  const { needsYouCount } = useShellInfo();
  return (
    <nav className={styles.appnav} aria-label="Afterlife">
      <SidebarSection title="Afterlife">
        {APP_NAV.map((e) => (
          <NavLink key={e.key} entry={e} current={e.key === active} needsYou={needsYouCount} />
        ))}
      </SidebarSection>
    </nav>
  );
}
