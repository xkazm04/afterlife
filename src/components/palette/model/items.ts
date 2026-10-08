// What the command palette can go to: every screen, the loop's key actions, and every project. Pure data.
import { APP_NAV, SETTINGS_NAV } from '@/components/shell/sidebar/navItems';

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

const ACTIONS: readonly PaletteItem[] = [
  { id: 'a:design', kind: 'action', label: 'Design the next cycle', hint: 'Cycles', href: '/cycles?design=1', keywords: 'plan improve round loop' },
  { id: 'a:estate', kind: 'action', label: 'See cycles across the estate', hint: 'Cycles', href: '/cycles?scope=estate', keywords: 'estate groups rollup every project cycles' },
  { id: 'a:batch', kind: 'action', label: 'Preview the next onboarding batch', hint: 'Onboard', href: '/onboard?preview=1', keywords: 'onboard run reads writes' },
  { id: 'a:send', kind: 'action', label: 'Send the picked gaps as you', hint: 'Maturity', href: '/maturity', keywords: 'gap mr send maturity' },
  { id: 'a:needs', kind: 'action', label: 'See what waits for you', hint: 'Needs you', href: '/needs-you', keywords: 'decisions inbox approve' },
  { id: 'a:revoke', kind: 'action', label: 'Take autonomy back', hint: 'Ladder', href: '/ladder', keywords: 'revoke quarantine demote tier' },
  { id: 'a:text', kind: 'action', label: 'Change the text size', hint: 'Settings', href: '/settings', keywords: 'font larger smaller zoom' },
];

/** Every item, screens first, then actions, then projects (the ranker reorders them by the query). */
export function paletteItems(projects: readonly ProjectRef[]): PaletteItem[] {
  const screens = [...APP_NAV, SETTINGS_NAV].map<PaletteItem>((e) => ({ id: `s:${e.key}`, kind: 'screen', label: e.label, hint: 'screen', href: e.href }));
  const projs = projects.map<PaletteItem>((p) => ({
    id: `p:${p.id}`,
    kind: 'project',
    label: p.name,
    hint: `${p.group} · ${p.state.replace(/-/g, ' ')}`,
    href: `/fleet?project=${encodeURIComponent(p.id)}`,
    keywords: p.group,
  }));
  return [...screens, ...ACTIONS, ...projs];
}
