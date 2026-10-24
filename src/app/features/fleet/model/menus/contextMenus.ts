// The right-click menus of a project row and of a group row.
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import type { FleetProject } from '@/lib/demo/types';
import { gitlabUrl } from '../inspector';

/** Where Reveal in GitLab goes: demo flashes the address it would open; live opens the project's stored GitLab page. */
export type RevealTarget = { kind: 'flash'; text: string } | { kind: 'open'; href: string };

export interface RowMenuArgs {
  project: FleetProject;
  portfolio: string;
  mode: 'demo' | 'live';
  collapsed: boolean;
  grouped: boolean;
  onOpen: () => void;
  onRepoll: () => void;
  onCopy: (path: string) => void;
  onReveal: (target: RevealTarget) => void;
  onToggleGroup: () => void;
}

/** The project's place in GitLab: portfolio / group / project. */
export const projectPath = (portfolio: string, p: FleetProject): string => `${portfolio}/${p.group}/${p.id}`;

/**
 * As the project page's Open in GitLab: demo says where it would go (no network); live opens the address a poll stored
 * (`webUrl`, http or https only), and has nothing to open before one did (null: the item is disabled).
 */
export function revealTarget(mode: 'demo' | 'live', p: FleetProject, path: string): RevealTarget | null {
  if (mode === 'demo') return { kind: 'flash', text: `${gitlabUrl(path)} (demo, no network)` };
  return p.webUrl && /^https?:\/\//i.test(p.webUrl) ? { kind: 'open', href: p.webUrl } : null;
}

export function rowMenu(a: RowMenuArgs): MenuEntry[] {
  const path = projectPath(a.portfolio, a.project);
  const reveal = revealTarget(a.mode, a.project, path);
  const g = a.project.group;
  return [
    { label: 'Open', sc: '↩', run: a.onOpen },
    { label: 'Re-poll', run: a.onRepoll },
    { sep: true },
    { label: 'Copy Project Path', run: () => a.onCopy(path) },
    { label: 'Reveal in GitLab', disabled: !reveal, run: () => reveal && a.onReveal(reveal) },
    { sep: true },
    { label: a.collapsed ? `Expand “${g}”` : `Collapse “${g}”`, disabled: !a.grouped, run: a.onToggleGroup },
  ];
}

export interface GroupMenuArgs {
  collapsed: boolean;
  onToggle: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onOnlyThis: () => void;
}

export function groupMenu(a: GroupMenuArgs): MenuEntry[] {
  return [
    { label: a.collapsed ? 'Expand' : 'Collapse', run: a.onToggle },
    { label: 'Collapse All', run: a.onCollapseAll },
    { label: 'Expand All', run: a.onExpandAll },
    { sep: true },
    { label: 'Show Only This Group', run: a.onOnlyThis },
  ];
}
