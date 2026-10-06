'use client';

import { usePathname } from 'next/navigation';
import { SETTINGS_NAV, activeNavKey } from './navItems';
import { NavLink } from './NavLink';
import styles from './Sidebar.module.css';

/** Settings, pinned to the bottom of the sidebar. */
export function SettingsNav() {
  const active = activeNavKey(usePathname());
  return (
    <nav className={styles.foot} aria-label="Settings">
      <NavLink entry={SETTINGS_NAV} current={active === SETTINGS_NAV.key} />
    </nav>
  );
}
