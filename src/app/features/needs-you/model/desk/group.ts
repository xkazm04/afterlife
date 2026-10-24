// The desk's table: rows in groups By kind, By project or By deadline, "Decided this week" always last; and the summary
// band's counts. The group names read as the live list and the demo desk name them. Pure.
import type { NeedsKind } from '@/lib/demo/types';
import type { Deadline, DeskGroup, DeskItem, DeskSummary, Grouping } from './types';

/** The read-only kinds with a group of their own, declared once: 'Elsewhere' takes every other one. */
const READ_ONLY_GROUPS = [['signoff', 'CRA sign-off'], ['setup', 'Setup']] as const satisfies readonly (readonly [NeedsKind, string])[];
const named = (k: NeedsKind | undefined): boolean => READ_ONLY_GROUPS.some(([g]) => g === k);

/** The kind groups, in the desk's order: what extends trust first, what this desk only reads last. */
const KIND_GROUPS: readonly { id: string; name: string; has: (n: DeskItem) => boolean }[] = [
  { id: 'k-promote', name: 'Extend trust', has: (n) => n.kind === 'promote' },
  { id: 'k-readmit', name: 'Re-admit', has: (n) => n.kind === 'readmit' },
  { id: 'k-gap', name: 'Maturity gaps', has: (n) => n.kind === 'gap' },
  ...READ_ONLY_GROUPS.map(([k, name]) => ({ id: `k-${k}`, name, has: (n: DeskItem) => n.kind === 'other' && n.source?.kind === k })),
  // any other read-only kind a later inbox adds still gets a row, and only one
  { id: 'k-other', name: 'Elsewhere', has: (n) => n.kind === 'other' && !named(n.source?.kind) },
];

const DEADLINES: readonly { id: Deadline; name: string }[] = [
  { id: 'overdue', name: 'Overdue' },
  { id: 'today', name: 'Due today' },
  { id: 'later', name: 'Due later' },
  { id: 'none', name: 'No deadline · oldest first' },
];

export const DECIDED_GROUP = 'decided';

/** Oldest openedAt first, an unknown start last, then by title. */
function byAge(a: DeskItem, b: DeskItem): number {
  if (a.openedAt !== b.openedAt) {
    if (a.openedAt === null) return 1;
    if (b.openedAt === null) return -1;
    return a.openedAt < b.openedAt ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
}

/** Newest act first, then by title. */
const byActed = (a: DeskItem, b: DeskItem): number =>
  (b.actedAt ?? '').localeCompare(a.actedAt ?? '') || a.title.localeCompare(b.title);

function openGroups(open: readonly DeskItem[], by: Grouping): DeskGroup[] {
  switch (by) {
    case 'kind':
      return KIND_GROUPS.map((g) => ({ id: g.id, name: g.name, items: open.filter(g.has) }));
    case 'project':
      return [...new Set(open.map((n) => n.group.project))].sort((a, b) => a.localeCompare(b))
        .map((p) => ({ id: `p-${p}`, name: p, items: open.filter((n) => n.group.project === p) }));
    case 'deadline':
      return DEADLINES.map((d) => ({ id: `d-${d.id}`, name: d.name, items: open.filter((n) => n.group.deadline === d.id) }));
  }
}

/** Rows in groups by kind, project or deadline; decided rows are always the last group. */
export function groupDesk(items: readonly DeskItem[], by: Grouping): DeskGroup[] {
  const open = items.filter((n) => n.kind !== 'decided');
  const decided = items.filter((n) => n.kind === 'decided').sort(byActed);
  return [...openGroups(open, by).map((g) => ({ ...g, items: [...g.items].sort(byAge) })), { id: DECIDED_GROUP, name: 'Decided this week', items: decided }]
    .filter((g) => g.items.length > 0);
}

/** The summary band: how many rows wait, across how many projects, and since when (null when no start is known). */
export function summarize(items: readonly DeskItem[]): DeskSummary {
  const open = items.filter((n) => n.kind !== 'decided');
  const known = open.map((n) => n.openedAt).filter((t): t is string => t !== null).sort();
  return { count: open.length, projects: new Set(open.map((n) => n.project)).size, oldestOpenedAt: known[0] ?? null };
}
