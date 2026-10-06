// Autonomy is held per action class, not per agent. Restricting is free; extending is earned.

export type Tier = 'quarantined' | 'assisted' | 'supervised' | 'hands_off';
export type Ceiling = Tier | 'human_only';

export const TIER_ORDER: readonly Tier[] = ['quarantined', 'assisted', 'supervised', 'hands_off'];

export const TIER_LABEL: Record<Ceiling, string> = {
  quarantined: 'QUARANTINED',
  assisted: 'ASSISTED',
  supervised: 'SUPERVISED',
  hands_off: 'HANDS-OFF',
  human_only: 'HUMAN ONLY',
};

export type DemotionTrigger =
  | 'revert'
  | 'reopened_finding'
  | 'post_merge_proof_fail'
  | 'default_branch_red_1h'
  | 'guardrail_high'
  | 'budget_breach_x2';

export interface TrustPolicy {
  version: 1;
  profile: 'standard' | 'demo';
  start_tier: Tier;
  cooldown_days: number;
  grant_ttl_days?: number;
  promotion: {
    assisted_to_supervised: { accepted: number; reverts: number; guardrail_blocks: number; window_last: number };
    supervised_to_hands_off: { accepted: number; no_edit_ratio: number; clean_days: number; human_key: true };
  };
  demotion: { one_step_on: DemotionTrigger[]; quarantine_on: DemotionTrigger[] };
  classes: Record<string, { agent: string; proof?: string; ceiling: Ceiling; deny_paths?: string[] }>;
  envelope: { hands_off: { max_files: number; max_lines: number; environments: string[] } };
}

export interface TierRecord {
  tier: Tier;
  since: string;
  by: string; // "tripwire" | "operator via promotion MR !12" | ...
  reason?: DemotionTrigger;
  evidence?: string;
  lease_expires?: string;
  cooldown_until?: string;
}

/** tier-state.yml: agents -> action class -> where it stands now. */
export interface TierState {
  version: 1;
  policy_sha: string;
  agents: Record<string, Record<string, TierRecord>>;
}

/** One step down, or straight to quarantine. Never moves up: promotion is a human's policy MR. */
export function demote(current: Tier, trigger: DemotionTrigger, policy: TrustPolicy): Tier {
  if (policy.demotion.quarantine_on.includes(trigger)) return 'quarantined';
  if (!policy.demotion.one_step_on.includes(trigger)) return current;
  const i = TIER_ORDER.indexOf(current);
  return TIER_ORDER[Math.max(0, i - 1)] ?? 'quarantined';
}
