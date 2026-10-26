// The app navigation: twelve screens in four groups, plus Settings at the bottom. Pure data and one pure matcher.
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

const SCREENS: Readonly<Record<string, NavEntry>> = {
  vitals: { key: 'vitals', href: '/vitals', label: 'Vitals', icon: 'vitals' },
  fleet: { key: 'fleet', href: '/fleet', label: 'Fleet', icon: 'fleet' },
  monitor: { key: 'monitor', href: '/monitor', label: 'Monitor', icon: 'monitor' },
  'needs-you': { key: 'needs-you', href: '/needs-you', label: 'Needs you', icon: 'needsYou', needsYouBadge: true },
  ladder: { key: 'ladder', href: '/ladder', label: 'Ladder', icon: 'ladder' },
  maturity: { key: 'maturity', href: '/maturity', label: 'Maturity', icon: 'maturity' },
  cycles: { key: 'cycles', href: '/cycles', label: 'Cycles', icon: 'cycles' },
  task: { key: 'task', href: '/task', label: 'Task', icon: 'task' },
  start: { key: 'start', href: '/start', label: 'Projects', icon: 'onboard', also: ['/onboard'] },
  setup: { key: 'setup', href: '/setup', label: 'Setup', icon: 'setup' },
  theater: { key: 'theater', href: '/theater', label: 'Theater', icon: 'theater' },
  runs: { key: 'runs', href: '/runs', label: 'Runs', icon: 'runs' },
};

export interface NavGroup {
  key: 'start' | 'watch' | 'govern' | 'improve';
  label: string;
  /** What the group is for, in one line (the guide's chapter line). */
  line: string;
  entries: readonly NavEntry[];
}

const group = (key: NavGroup['key'], label: string, line: string, keys: readonly string[]): NavGroup => ({
  key,
  label,
  line,
  // A to Z inside a group: the group says what the screens are for, the order only has to be findable.
  entries: keys.map((k) => SCREENS[k]!).sort((x, y) => x.label.localeCompare(y.label)),
});

/**
 * The sidebar's groups, in the order a person meets them: bring projects in, watch them, govern what the agents may do
 * and decide what waits, then improve the projects over time. The guide's chapters are these groups.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  group('start', 'Start', 'Bring your projects in and arm the agents.', ['start', 'setup']),
  group('watch', 'Watch', 'See the whole estate, live and in replay.', ['fleet', 'monitor', 'theater', 'vitals']),
  group('govern', 'Govern', 'What agents did, may do, and what only you decide.', ['ladder', 'needs-you', 'task']),
  group('improve', 'Improve', 'Make the projects better, round by round.', ['cycles', 'maturity', 'runs']),
];

/** Every app screen, group by group. */
export const APP_NAV: readonly NavEntry[] = NAV_GROUPS.flatMap((g) => g.entries);

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
