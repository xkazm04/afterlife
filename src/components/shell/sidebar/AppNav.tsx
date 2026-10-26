'use client';

import { Suspense } from 'react';
import { useHerePath } from '@/components/shell/host';
import { useModCap } from '@/lib/keyboard/modKey';
import { openPalette } from '@/components/palette/CommandPalette';
import { navShown } from '@/lib/settings/demoEstate';
import { useShellInfo } from '../ShellContext';
import { APP_NAV, activeNavKey } from './navItems';
import { NavLink } from './NavLink';
import { SidebarSection } from './SidebarSection';
import styles from './Sidebar.module.css';

/**
 * The app screens; the current one comes from the route (useHerePath: the host's screen in the click's own frame, else usePathname). The ⌘K (Ctrl+K off Apple platforms) chip opens the command palette.
 * Under Cache Components a dynamic route's pathname is request data, so the read sits behind <Suspense>: the prerendered
 * shell draws the same nav with nothing current, and the routed one replaces it. With the demo estate off (Settings, or
 * 'auto' once a real project is saved) the demo screens leave the nav; their routes still answer, bannered.
 */
export function AppNav() {
  return (
    <Suspense fallback={<NavList active={null} />}>
      <RoutedNav />
    </Suspense>
  );
}

function RoutedNav() {
  return <NavList active={activeNavKey(useHerePath())} />;
}

function NavList({ active }: { active: string | null }) {
  const { needsYouCount, estate } = useShellInfo();
  const mod = useModCap();
  return (
    <nav className={styles.appnav} aria-label="Afterlife">
      <SidebarSection
        title="Afterlife"
        aux={
          <button type="button" className={styles.goto} title={`Go to anything (${mod}K)`} aria-label={`Go to anything (${mod}K)`} onClick={openPalette}>
            {`${mod}K`}
          </button>
        }
      >
        {APP_NAV.filter((e) => navShown(e.key, estate)).map((e) => (
          <NavLink key={e.key} entry={e} current={e.key === active} needsYou={needsYouCount ?? undefined} />
        ))}
      </SidebarSection>
    </nav>
  );
}
