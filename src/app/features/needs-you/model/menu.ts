// What the right-click menu offers for a row or a group row. Pure: the hook turns each intent into a callback.
import type { NeedsYouDemo } from '../data/types';
import { commandsFor } from './outbox/commands';
import { groupOf } from './rows/grouping';
import { rowAction } from './rows/rowAction';
import { isGapId } from './rows/rowState';
import type { ActionId, NeedsState } from './types';

export type MenuIntent =
  | { kind: 'inspect' }
  | { kind: 'act'; action: ActionId }
  | { kind: 'copy'; text: string }
  | { kind: 'collapse'; group: string }
  | { kind: 'toggle'; group: string }
  | { kind: 'expandAll' };
export type MenuPlanItem = { sep: true } | { label: string; sc?: string; intent: MenuIntent };

export function rowMenuPlan(s: NeedsState, id: string, demo: NeedsYouDemo): readonly MenuPlanItem[] {
  const items: MenuPlanItem[] = [{ label: 'Show in Inspector', sc: '↩', intent: { kind: 'inspect' } }];
  const a = rowAction(s, id);
  if (a) items.push({ label: a.label, intent: { kind: 'act', action: a.action } });
  if (id === 'n1' && s.status.n1 === 'open') items.push({ label: 'Not yet', intent: { kind: 'act', action: 'snooze-n1' } });
  if (id === 'n4' && (s.status.n4 === 'open' || s.status.n4 === 'staged')) {
    items.push({ sep: true }, { label: 'Retire (runs now)', intent: { kind: 'act', action: 'retire-n4' } });
  }
  if (isGapId(id) && !s.gapStatus[id]) items.push({ label: s.gaps[id] ? 'Untick' : 'Pick', sc: 'Space', intent: { kind: 'act', action: `tick:${id}` } });
  const cmds = commandsFor(id, demo);
  if (cmds) items.push({ sep: true }, { label: 'Copy Command', intent: { kind: 'copy', text: cmds.join('\n') } });
  const g = groupOf(s.group, s, id);
  if (g) items.push({ sep: true }, { label: `Collapse “${g.name}”`, intent: { kind: 'collapse', group: g.id } });
  return items;
}

export function groupMenuPlan(s: NeedsState, groupId: string): readonly MenuPlanItem[] {
  return [
    { label: s.collapsed.includes(groupId) ? 'Expand' : 'Collapse', intent: { kind: 'toggle', group: groupId } },
    { label: 'Expand All', intent: { kind: 'expandAll' } },
  ];
}
