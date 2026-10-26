'use client';

import { Suspense } from 'react';
import { useHerePath } from '@/components/shell/host';
import { useModCap } from '@/lib/keyboard/modKey';
import { openPalette } from '@/components/palette/CommandPalette';
import { navShown } from '@/lib/settings/demoEstate';
import { useShellInfo } from '../ShellContext';
import { NAV_GROUPS, activeNavKey } from './navItems';
import { NavLink } from './NavLink';
import { SidebarSection } from './SidebarSection';
import styles from './Sidebar.module.css';

/**
 * The app screens in their four groups (Start, Watch, Govern, Improve; A to Z inside each); the current one comes from the route (useHerePath: the host's screen in the click's own frame, else usePathname). The ⌘K (Ctrl+K off Apple platforms) chip opens the command palette.
 * Under Cache Components a dynamic route's pathname is request data, so the read sits behind <Suspense>: the prerendered
 * shell draws the same nav with nothing current, and the routed one replaces it. With the demo estate off (Settings, or
 * 'auto' once a real project is saved) the demo screens leave the nav, and a group left empty goes with them; their
 * routes still answer, bannered. `onOpenCurrent`: the screen in front has sections of its own (the sidebar's second
 * level); its entry shows a chevron, and a click on it goes back down to them.
 */
export function AppNav({ onOpenCurrent }: { onOpenCurrent?: (() => void) | undefined }) {
  return (
    <Suspense fallback={<NavList active={null} />}>
      <RoutedNav onOpenCurrent={onOpenCurrent} />
    </Suspense>
  );
}

function RoutedNav({ onOpenCurrent }: { onOpenCurrent?: (() => void) | undefined }) {
  return <NavList active={activeNavKey(useHerePath())} onOpenCurrent={onOpenCurrent} />;
}

function NavList({ active, onOpenCurrent }: { active: string | null; onOpenCurrent?: (() => void) | undefined }) {
  const { needsYouCount, estate } = useShellInfo();
  const mod = useModCap();
  return (
    <nav className={styles.appnav} aria-label="Afterlife">
      {NAV_GROUPS.map((g) => ({ ...g, shown: g.entries.filter((e) => navShown(e.key, estate)) }))
        .filter((g) => g.shown.length > 0)
        .map((g, i) => (
          <SidebarSection
            key={g.key}
            title={g.label}
            aux={
              i === 0 ? (
                <button type="button" className={styles.goto} title={`Go to anything (${mod}K)`} aria-label={`Go to anything (${mod}K)`} onClick={openPalette}>
                  {`${mod}K`}
                </button>
              ) : undefined
            }
          >
            {g.shown.map((e) => (
              <NavLink
                key={e.key}
                entry={e}
                current={e.key === active}
                needsYou={needsYouCount ?? undefined}
                onOpen={e.key === active ? onOpenCurrent : undefined}
              />
            ))}
          </SidebarSection>
        ))}
    </nav>
  );
}
