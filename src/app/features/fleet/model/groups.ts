// Grouping and the numbers on a group row: tier totals, needs-you sum, proofs sum, average rung.
import type { FleetProject, ProofCounts, TierKey } from '@/lib/demo/types';
import { groupNavId, type NavItem } from '@/components/table/model/rowNavigation';
import { tiersKnown } from '@/lib/tiers';
import type { GroupBlock } from './types';

/** Visible projects split by group, in the fleet's group order; groups with nothing visible are left out. */
export function groupBlocks(groups: readonly string[], visible: readonly FleetProject[]): GroupBlock[] {
  return groups.map((group) => ({ group, projects: visible.filter((p) => p.group === group) })).filter((b) => b.projects.length > 0);
}

/** The rows the keyboard walks: a group, then its projects unless collapsed; or every project when not grouped. */
export function navItems(blocks: readonly GroupBlock[], collapsed: ReadonlySet<string>, grouped: boolean, flat: readonly FleetProject[]): NavItem[] {
  if (!grouped) return flat.map((p) => ({ id: p.id, kind: 'row' as const }));
  return blocks.flatMap((b) => {
    const open = !collapsed.has(b.group);
    const gid = groupNavId(b.group);
    const head: NavItem = { id: gid, kind: 'group', expanded: open };
    return open ? [head, ...b.projects.map((p) => ({ id: p.id, kind: 'row' as const, parent: gid }))] : [head];
  });
}

/** Decisions waiting in a list; an unwatched project's count is not shown anywhere, so it is not summed. */
export const needsSum = (list: readonly FleetProject[]): number => list.reduce((a, p) => a + (p.state === 'not-set-up' ? 0 : p.needsYou), 0);

/** A tier summed over the projects whose tiers are known; null (unknown, not 0) when none is. */
export function tierTotal(list: readonly FleetProject[], t: TierKey): number | null {
  const known = list.filter(tiersKnown);
  return known.length ? known.reduce((a, p) => a + p.tiers[t], 0) : null;
}

/** Proofs summed; projects with unknown proofs add nothing. */
export const proofsSum = (list: readonly FleetProject[]): ProofCounts =>
  list.reduce<ProofCounts>(
    (a, p) => (p.proofs7d ? { pass: a.pass + p.proofs7d.pass, fail: a.fail + p.proofs7d.fail, inconclusive: a.inconclusive + p.proofs7d.inconclusive } : a),
    { pass: 0, fail: 0, inconclusive: 0 },
  );

/** The rounded mean rung of a stage over the projects that know it; null when none does. */
export function stageAverage(list: readonly FleetProject[], stage: number): number | null {
  const v = list.map((p) => p.stages[stage]).filter((x): x is number => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
