'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { SETTINGS_NAV, activeNavKey } from './navItems';
import { NavLink } from './NavLink';
import styles from './Sidebar.module.css';

/** Settings, pinned to the bottom of the sidebar. The pathname read waits behind <Suspense> (see AppNav). */
export function SettingsNav() {
  return (
    <Suspense fallback={<SettingsLink active={null} />}>
      <RoutedSettings />
    </Suspense>
  );
}

function RoutedSettings() {
  return <SettingsLink active={activeNavKey(usePathname())} />;
}

function SettingsLink({ active }: { active: string | null }) {
  return (
    <nav className={styles.foot} aria-label="Settings">
      <NavLink entry={SETTINGS_NAV} current={active === SETTINGS_NAV.key} />
    </nav>
  );
}
