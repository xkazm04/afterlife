// The app navigation: twelve screens plus Settings at the bottom. Pure data and one pure matcher.
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
  { key: 'cycles', href: '/cycles', label: 'Cycles', icon: 'cycles' },
  { key: 'task', href: '/task', label: 'Task', icon: 'task' },
  { key: 'onboard', href: '/onboard', label: 'Onboard', icon: 'onboard' },
  { key: 'setup', href: '/setup', label: 'Setup', icon: 'setup' },
  { key: 'trace', href: '/trace', label: 'Trace', icon: 'probe' },
  { key: 'theater', href: '/theater', label: 'Theater', icon: 'theater' },
  { key: 'runs', href: '/runs', label: 'Runs', icon: 'runs' },
];

export const SETTINGS_NAV: NavEntry = { key: 'settings', href: '/settings', label: 'Settings', icon: 'settings' };

/** Every screen, the pinned footer entry last: the one list the palette, the door menu and the loading title read. */
export const ALL_NAV: readonly NavEntry[] = [...APP_NAV, SETTINGS_NAV];

/** The nav entry a pathname is in: every entry owns its sub-paths; "/" (the front door) is none of them. */
export function navEntryFor(pathname: string): NavEntry | null {
  return ALL_NAV.find((e) => pathname === e.href || pathname.startsWith(`${e.href}/`)) ?? null;
}

/** Which nav item is current for a pathname. */
export function activeNavKey(pathname: string): string | null {
  return navEntryFor(pathname)?.key ?? null;
}
