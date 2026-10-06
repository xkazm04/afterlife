// The right-click menus of a project row and of a group row.
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import type { FleetProject } from '@/lib/demo/types';

export interface RowMenuArgs {
  project: FleetProject;
  portfolio: string;
  collapsed: boolean;
  grouped: boolean;
  onOpen: () => void;
  onRepoll: () => void;
  onCopy: (path: string) => void;
  onReveal: (path: string) => void;
  onToggleGroup: () => void;
}

/** The project's place in GitLab: portfolio / group / project. */
export const projectPath = (portfolio: string, p: FleetProject): string => `${portfolio}/${p.group}/${p.id}`;

export function rowMenu(a: RowMenuArgs): MenuEntry[] {
  const path = projectPath(a.portfolio, a.project);
  const g = a.project.group;
  return [
    { label: 'Open', sc: '↩', run: a.onOpen },
    { label: 'Re-poll', run: a.onRepoll },
    { sep: true },
    { label: 'Copy Project Path', run: () => a.onCopy(path) },
    { label: 'Reveal in GitLab', run: () => a.onReveal(path) },
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
