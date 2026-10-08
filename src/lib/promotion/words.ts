// The words of the promotion rule: why Promote is greyed, its tooltip, and the line shown instead of counts.
import { NOT_RECORDED, type Promotion } from './promotion';

/** Why Promote is greyed, naming the first rule that is unmet or not recorded when there are counts. */
export function whyNot(p: Promotion): string {
  if (p.kind === 'eligible') return '';
  if (p.kind !== 'notyet') return WHY_NOT[p.kind];
  const r = p.rules.find((x) => !x.met);
  if (!r) return WHY_NOT.notyet;
  return r.value === NOT_RECORDED ? `${r.name} is not recorded: no task or ledger event states it` : `${r.name} is not met (${r.value})`;
}

/** Why Promote is greyed, for the status line. */
export const WHY_NOT: Record<Exclude<Promotion['kind'], 'eligible'>, string> = {
  notyet: 'the record does not qualify yet (↵ shows the counts)',
  ceiling: 'it is at its ceiling',
  readmit: 'it is quarantined: re-admit in Needs you, at Assisted at most',
  never: 'it is never an agent',
  unknown: 'there is no record yet',
  nopolicy: 'trust-policy.yml has not been read, so there are no thresholds',
  norecord: 'no agent holds it yet: not trusted, and not quarantined',
  split: 'several agents hold it, each at its own tier: a policy MR promotes one holder',
  untiered: 'its tier is unknown',
};

/** Tooltip of the row's Promote button. */
export function promoteTitle(kind: Promotion['kind']): string {
  if (kind === 'eligible') return 'Promote via a policy MR (p)';
  return kind === 'ceiling' ? 'At its ceiling' : 'Record does not qualify yet';
}

/** The muted line shown instead of rule counts. */
export const NO_RULES: Record<'ceiling' | 'readmit' | 'never' | 'unknown' | 'nopolicy' | 'norecord' | 'split' | 'untiered', string> = {
  ceiling: 'At its ceiling · higher is a track rebuild',
  readmit: 'Quarantined · re-admit at Assisted at most',
  never: 'Never an agent',
  unknown: 'No record yet',
  nopolicy: 'No thresholds · trust-policy.yml has not been read',
  norecord: 'No record yet · not trusted, not quarantined',
  split: 'Split · each holder at its own tier, as CI gates its merge requests',
  untiered: 'Tier unknown',
};
