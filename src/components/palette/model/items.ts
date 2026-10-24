// What the command palette can go to: every screen, the loop's key actions, and every project. Pure data.
import { ALL_NAV, navEntryFor } from '@/components/shell/sidebar/navItems';

export interface PaletteItem {
  id: string;
  kind: 'screen' | 'action' | 'project';
  label: string;
  /** Dim text on the right: where it goes, or a project's group and state. */
  hint: string;
  href: string;
  /** Extra words it answers to (not shown). */
  keywords?: string;
}

/** A project as the palette knows it: enough to find it and say where it stands. */
export interface ProjectRef {
  id: string;
  name: string;
  group: string;
  state: string;
}

// An action's hint is the screen its href lands on, read from the nav (never copied, so a renamed screen cannot drift).
const ACTIONS: readonly Omit<PaletteItem, 'hint'>[] = [
  { id: 'a:design', kind: 'action', label: 'Design the next cycle', href: '/cycles?design=1', keywords: 'plan improve round loop' },
  { id: 'a:estate', kind: 'action', label: 'See cycles across the estate', href: '/cycles?scope=estate', keywords: 'estate groups rollup every project cycles' },
  { id: 'a:batch', kind: 'action', label: 'Preview the next onboarding batch', href: '/onboard?preview=1', keywords: 'onboard run reads writes' },
  { id: 'a:send', kind: 'action', label: 'Send the picked gaps as you', href: '/maturity', keywords: 'gap mr send maturity' },
  { id: 'a:needs', kind: 'action', label: 'See what waits for you', href: '/needs-you', keywords: 'decisions inbox approve' },
  { id: 'a:revoke', kind: 'action', label: 'Take autonomy back', href: '/ladder', keywords: 'revoke quarantine demote tier' },
  { id: 'a:xray', kind: 'action', label: 'Show X-ray', href: '/fleet?xray=1', keywords: 'onboarding tour help label parts first run guide' },
  { id: 'a:first', kind: 'action', label: 'Set up my first project', href: '/trace', keywords: 'onboarding glab login group live doctor setup connect' },
  { id: 'a:text', kind: 'action', label: 'Change the text size', href: '/settings', keywords: 'font larger smaller zoom' },
];

/** The label of the screen an href lands on ("" for none). */
export const screenOf = (href: string): string => navEntryFor(href.split('?')[0] ?? '')?.label ?? '';

/** Every item, screens first, then actions, then projects (the ranker reorders them by the query). */
export function paletteItems(projects: readonly ProjectRef[]): PaletteItem[] {
  const screens = ALL_NAV.map<PaletteItem>((e) => ({ id: `s:${e.key}`, kind: 'screen', label: e.label, hint: 'screen', href: e.href }));
  const projs = projects.map<PaletteItem>((p) => ({
    id: `p:${p.id}`,
    kind: 'project',
    label: p.name,
    hint: `${p.group} · ${p.state.replace(/-/g, ' ')}`,
    href: `/fleet?project=${encodeURIComponent(p.id)}`,
    keywords: p.group,
  }));
  const actions = ACTIONS.map<PaletteItem>((a) => ({ ...a, hint: screenOf(a.href) }));
  return [...screens, ...actions, ...projs];
}
