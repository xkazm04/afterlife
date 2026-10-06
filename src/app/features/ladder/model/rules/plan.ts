// The exact write behind a revoke: the yq edits, the commit and the tier-state.yml diff. Shown before it runs.
import { TIER_META } from '@/lib/tiers';
import type { Change, ClassRow, Tier } from '../types';

/** The operator's login in the demo. */
export const OPERATOR = '@operator';
export const MANUAL_REVOKE = 'manual revoke';

export interface PlanRow {
  cls: ClassRow;
  from: ClassRow['tier'];
  to: Tier;
}

export interface Plan {
  rows: PlanRow[];
  msg: string;
  /** Shell lines, in order. */
  cmd: string[];
  /** tier-state.yml diff lines ("+ ", "- " or context). */
  diff: string[];
}

export function buildPlan(byId: Readonly<Record<string, ClassRow>>, changes: readonly Change[], why = MANUAL_REVOKE): Plan {
  const rows: PlanRow[] = [];
  for (const { id, to } of changes) {
    const cls = byId[id];
    if (cls) rows.push({ cls, from: cls.tier, to });
  }
  const first = rows[0];
  const msg = first ? `demote ${first.cls.id}: ${first.from} -> ${first.to} (${why})` : '';
  const cmd = [
    'cd belay-policy && git pull --ff-only',
    ...rows.map((r) => `yq -i '.classes["${r.cls.id}"].tier = "${r.to}"' tier-state.yml`),
    `git commit -am "${msg}"`,
    'git push origin main     # as you, over your glab login',
  ];
  const diff = rows.flatMap((r) => [
    `  ${r.cls.id}:`,
    `-   tier: ${r.from}`,
    ...(r.cls.lease_days ? [`-   lease_days: ${r.cls.lease_days}`] : []),
    `+   tier: ${r.to}`,
    `+   moved: { by: "${OPERATOR}", why: "${why}" }`,
  ]);
  return { rows, msg, cmd, diff };
}

/** The ledger text of a commit: "commit e7f1 in belay-policy: a Supervised → Assisted". */
export function commitText(sha: string, rows: readonly PlanRow[]): string {
  return `commit ${sha} in belay-policy: ` + rows.map((r) => `${r.cls.id} ${TIER_META[r.from].name} → ${TIER_META[r.to].name}`).join(' · ');
}

/** The one-line form shown in the docked strip. */
export const dockCommand = (plan: Plan): string => `git commit -am "${plan.msg}" && git push origin main`;
