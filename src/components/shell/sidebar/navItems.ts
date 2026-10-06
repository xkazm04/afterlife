// The app navigation: eight screens plus Settings at the bottom. Pure data and one pure matcher.
import type { IconName } from '@/components/icons/glyphs';

export interface NavEntry {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  /** Show the number of decisions waiting for the operator as a badge. */
  needsYouBadge?: boolean;
}

export const APP_NAV: readonly NavEntry[] = [
  { key: 'fleet', href: '/fleet', label: 'Fleet', icon: 'fleet' },
  { key: 'monitor', href: '/monitor', label: 'Monitor', icon: 'monitor' },
  { key: 'needs-you', href: '/needs-you', label: 'Needs you', icon: 'needsYou', needsYouBadge: true },
  { key: 'ladder', href: '/ladder', label: 'Ladder', icon: 'ladder' },
  { key: 'maturity', href: '/maturity', label: 'Maturity', icon: 'maturity' },
  { key: 'task', href: '/task', label: 'Task', icon: 'task' },
  { key: 'setup', href: '/setup', label: 'Setup', icon: 'setup' },
  { key: 'theater', href: '/theater', label: 'Theater', icon: 'theater' },
];

export const SETTINGS_NAV: NavEntry = { key: 'settings', href: '/settings', label: 'Settings', icon: 'settings' };

/** Which nav item is current for a pathname: every entry owns its sub-paths; "/" (the front door) is none of them. */
export function activeNavKey(pathname: string): string | null {
  for (const e of [...APP_NAV, SETTINGS_NAV]) {
    if (pathname === e.href || pathname.startsWith(`${e.href}/`)) return e.key;
  }
  return null;
}
