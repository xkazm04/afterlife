// The app navigation: twelve screens plus Settings at the bottom. Pure data and one pure matcher.
import type { IconName } from '@/components/icons/glyphs';

export interface NavEntry {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  /** Show the number of decisions waiting for the operator as a badge. */
  needsYouBadge?: boolean;
  /** Older paths whose sub-paths still live under this entry (/onboard/estate is Set up's demo estate). */
  also?: readonly string[];
}

export const APP_NAV: readonly NavEntry[] = [
  { key: 'vitals', href: '/vitals', label: 'Vitals', icon: 'vitals' },
  { key: 'fleet', href: '/fleet', label: 'Fleet', icon: 'fleet' },
  { key: 'monitor', href: '/monitor', label: 'Monitor', icon: 'monitor' },
  { key: 'needs-you', href: '/needs-you', label: 'Needs you', icon: 'needsYou', needsYouBadge: true },
  { key: 'ladder', href: '/ladder', label: 'Ladder', icon: 'ladder' },
  { key: 'maturity', href: '/maturity', label: 'Maturity', icon: 'maturity' },
  { key: 'cycles', href: '/cycles', label: 'Cycles', icon: 'cycles' },
  { key: 'task', href: '/task', label: 'Task', icon: 'task' },
  { key: 'start', href: '/start', label: 'Set up', icon: 'onboard', also: ['/onboard'] },
  { key: 'setup', href: '/setup', label: 'Setup', icon: 'setup' },
  { key: 'theater', href: '/theater', label: 'Theater', icon: 'theater' },
  { key: 'runs', href: '/runs', label: 'Runs', icon: 'runs' },
];

/** Settings opens on its first page, so the click is the screen host's (/settings itself only redirects deep links). */
export const SETTINGS_NAV: NavEntry = { key: 'settings', href: '/settings/display', label: 'Settings', icon: 'settings' };

/** Every screen, the pinned footer entry last: the one list the palette, the door menu and the loading title read. */
export const ALL_NAV: readonly NavEntry[] = [...APP_NAV, SETTINGS_NAV];

/**
 * The nav entry a pathname is in: every entry owns its key's path and its sub-paths (Settings links to its first page
 * and is current on every one of them); "/" (the front door) is none of them.
 */
export function navEntryFor(pathname: string): NavEntry | null {
  const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return ALL_NAV.find((e) => under(`/${e.key}`) || e.also?.some(under)) ?? null;
}

/** Which nav item is current for a pathname. */
export function activeNavKey(pathname: string): string | null {
  return navEntryFor(pathname)?.key ?? null;
}
