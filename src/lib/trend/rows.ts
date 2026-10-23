// A day's fleet_day rows from the fleet as the screens show it: the same needs the group sum counts, stale as the
// state says, hands-off only when the tiers are known, and the stability and spend read beside it. Pure.
import type { FleetProject } from '@/lib/demo/types';
import type { ProjectCost } from '@/lib/runs/desk/join';
import type { Stability } from '@/lib/stability/stability';
import { tiersKnown } from '@/lib/tiers';
import type { FleetDayRow } from './trend';

/** One row per project for `day`. `stability` and `cost` by project id; absent (or a project absent): null, never 0. */
export function dayRowsOf(
  day: string,
  projects: readonly FleetProject[],
  stability: Readonly<Record<string, Stability>> | null = null,
  cost: Readonly<Record<string, ProjectCost>> | null = null,
): FleetDayRow[] {
  return projects.map((p) => ({
    day,
    projectId: p.id,
    groupPath: p.group,
    needs: p.state === 'not-set-up' ? 0 : p.needsYou,
    stale: p.state === 'stale',
    handsOff: tiersKnown(p) ? p.tiers.hands_off : null,
    proofs7d: p.proofs7d ? p.proofs7d.pass + p.proofs7d.fail + p.proofs7d.inconclusive : null,
    redRate: stability?.[p.id]?.redRate ?? null,
    costUsd: cost?.[p.id]?.costUsd ?? null,
  }));
}
