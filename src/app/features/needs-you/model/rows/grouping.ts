// Group the decisions By kind / By project / By deadline, filter them, and list what the keyboard can visit.
import type { NavItem } from '@/components/table/model/rowNavigation';
import { groupNavId } from '@/components/table/model/rowNavigation';
import { POLICY_REPO, PROJECT_REPO, SETTINGS_GROUP } from '../../data/constants';
import type { NeedsYouDemo } from '../../data/types';
import type { GroupMode, NeedsState } from '../types';
import { histRows } from './history';
import { rowView } from './rowData';
import { isDecided, isInOutbox, isWaiting } from './rowState';

export interface GroupDef {
  id: string;
  name: string;
  ids: readonly string[];
  hist?: boolean;
}
export const HIST_GROUP = 'hist';
const GAPS = ['g1', 'g2', 'g3', 'g4'];

const BASE: Record<GroupMode, readonly GroupDef[]> = {
  kind: [
    { id: 'clock', name: 'Legal clock', ids: ['n2'] },
    { id: 'trust', name: 'Extend trust', ids: ['n1', 'n4'] },
    { id: 'improve', name: 'Improve the project', ids: GAPS },
    { id: 'setup', name: 'Finish setup', ids: ['n5'] },
  ],
  project: [
    { id: 'p-ll', name: PROJECT_REPO, ids: ['n2', ...GAPS] },
    { id: 'p-pol', name: POLICY_REPO, ids: ['n1', 'n4'] },
    { id: 'p-set', name: SETTINGS_GROUP, ids: ['n5'] },
  ],
  deadline: [
    { id: 'd-clock', name: 'On a clock', ids: ['n2'] },
    { id: 'd-none', name: 'No deadline · oldest first', ids: ['n5', 'n1', ...GAPS, 'n4'] },
  ],
};

/** The groups for a mode, with "Decided this week" last. */
export function groupsFor(mode: GroupMode, s: Pick<NeedsState, 'session'>): readonly GroupDef[] {
  const hist: GroupDef = { id: HIST_GROUP, name: 'Decided this week', ids: histRows(s).map((_, i) => `h${i}`), hist: true };
  return [...BASE[mode], hist];
}

/** Does the row pass the sidebar filter and the search box? */
export function isVisible(s: NeedsState, id: string, demo: NeedsYouDemo): boolean {
  const q = s.query.trim().toLowerCase();
  if (id.startsWith('h')) {
    if (s.show !== 'all' && s.show !== 'sent') return false;
    const r = histRows(s)[Number(id.slice(1))];
    return !!r && (!q || [r.kind, r.what, r.result, r.ref].join(' ').toLowerCase().includes(q));
  }
  if (s.show === 'waiting' && !isWaiting(s, id)) return false;
  if (s.show === 'outbox' && !isInOutbox(s, id)) return false;
  if (s.show === 'sent' && !isDecided(s, id)) return false;
  return !q || (rowView(s, id, demo)?.title.toLowerCase().includes(q) ?? false);
}

export interface VisibleGroup extends GroupDef {
  visible: readonly string[];
  expanded: boolean;
}

export function visibleGroups(s: NeedsState, demo: NeedsYouDemo): readonly VisibleGroup[] {
  return groupsFor(s.group, s)
    .map((g) => ({ ...g, visible: g.ids.filter((id) => isVisible(s, id, demo)), expanded: !s.collapsed.includes(g.id) }))
    .filter((g) => g.visible.length > 0);
}

/** Every row the keyboard can visit, in order: group rows, then their rows when expanded. */
export function navItems(groups: readonly VisibleGroup[]): readonly NavItem[] {
  const items: NavItem[] = [];
  for (const g of groups) {
    const gid = groupNavId(g.id);
    items.push({ id: gid, kind: 'group', expanded: g.expanded });
    if (g.expanded) for (const id of g.visible) items.push({ id, kind: 'row', parent: gid });
  }
  return items;
}

/** The group a row belongs to in the current mode. */
export function groupOf(mode: GroupMode, s: Pick<NeedsState, 'session'>, id: string): GroupDef | undefined {
  return groupsFor(mode, s).find((g) => g.ids.includes(id));
}

