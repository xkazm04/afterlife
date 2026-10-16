// Autonomy is held per action class, not per agent. Restricting is free; extending is earned.

export type Tier = 'quarantined' | 'assisted' | 'supervised' | 'hands_off';
export type Ceiling = Tier | 'human_only';

export const TIER_ORDER: readonly Tier[] = ['quarantined', 'assisted', 'supervised', 'hands_off'];

/** Every trigger the tripwire can be handed: the one list the engine, the policy reader and the screens share. */
export const DEMOTION_TRIGGERS = ['revert', 'reopened_finding', 'post_merge_proof_fail', 'default_branch_red_1h', 'guardrail_high', 'budget_breach_x2'] as const;
export type DemotionTrigger = (typeof DEMOTION_TRIGGERS)[number];

export interface TrustPolicy {
  version: 1;
  profile: 'standard' | 'demo';
  start_tier: Tier;
  cooldown_days: number;
  grant_ttl_days?: number;
  promotion: {
    // gated: all - every accepted output the step counts was decided by belay-apply's gate (a tier_decision event)
    // trial: {min, catches} - the next rung's trial (src/schemas/trial.ts): at least `min` resolved, at most `catches` caught
    assisted_to_supervised: { accepted: number; reverts: number; guardrail_blocks: number; window_last: number; gated?: 'all'; trial?: { min: number; catches: number } };
    supervised_to_hands_off: { accepted: number; no_edit_ratio: number; clean_days: number; human_key: true; gated?: 'all'; trial?: { min: number; catches: number } };
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
