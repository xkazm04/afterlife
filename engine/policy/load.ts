// Loads and validates policy/trust-policy.yml and policy/tier-state.yml. The files are structured data
// a person reviews; the engine refuses a malformed one instead of guessing what it meant.
import { TIER_ORDER, type DemotionTrigger, type Tier, type TierState, type TrustPolicy } from '../../src/schemas/tier';
import { readYaml } from '../core/files';
import { EngineError, isRecord, num, rec, strList, type Ctx } from '../core/types';

/** Optional thresholds for the rerun-stats class. When the policy has no `rerun_stats` block, defaults apply. */
export interface RerunThresholds {
  min_runs: number;
  real_failure_rate: number;
}

export interface EnginePolicy extends TrustPolicy {
  envelope: TrustPolicy['envelope'] & { production_requires_proof?: string[] };
  classes: Record<string, TrustPolicy['classes'][string] & { allow_paths?: string[] }>;
  rerun_stats?: Partial<RerunThresholds>;
}

const CEILINGS = [...TIER_ORDER, 'human_only'];

// Every trigger the tripwire can be handed. A Record keyed by the schema's union, so adding a trigger there fails the typecheck here.
const TRIGGER_SET: Record<DemotionTrigger, true> = { revert: true, reopened_finding: true, post_merge_proof_fail: true, default_branch_red_1h: true, guardrail_high: true, budget_breach_x2: true };
export const DEMOTION_TRIGGERS = Object.keys(TRIGGER_SET) as DemotionTrigger[];

/** A trigger the tripwire never fires would sit in the policy doing nothing, so a typo there silently disarms the demotion. */
function triggerList(v: unknown, what: string): void {
  const unknown = strList(v, what).filter((t) => !DEMOTION_TRIGGERS.includes(t as DemotionTrigger));
  if (unknown.length) throw new EngineError(`${what} names ${unknown.map((t) => `"${t}"`).join(', ')}, which is not a demotion trigger (${DEMOTION_TRIGGERS.join(', ')})`);
}

/** A threshold that is not a number makes every comparison false: a NaN rate calls a job that failed 5 of 6 times a flake. */
function rerunThresholds(raw: unknown): void {
  const r = rec(raw, 'trust-policy.rerun_stats');
  if (r.min_runs !== undefined && !(Number.isInteger(num(r.min_runs, 'rerun_stats.min_runs')) && (r.min_runs as number) >= 1)) {
    throw new EngineError('rerun_stats.min_runs must be a whole number of at least 1');
  }
  if (r.real_failure_rate !== undefined) {
    const rate = num(r.real_failure_rate, 'rerun_stats.real_failure_rate');
    if (rate <= 0 || rate > 1) throw new EngineError('rerun_stats.real_failure_rate must be above 0 and at most 1');
  }
}

export function parsePolicy(raw: unknown): EnginePolicy {
  const p = rec(raw, 'trust-policy');
  if (p.version !== 1) throw new EngineError('trust-policy.version must be 1');
  const classes = rec(p.classes, 'trust-policy.classes');
  for (const [id, c] of Object.entries(classes)) {
    const cls = rec(c, `classes.${id}`);
    if (typeof cls.agent !== 'string') throw new EngineError(`classes.${id}.agent must be a string`);
    if (typeof cls.ceiling !== 'string' || !CEILINGS.includes(cls.ceiling)) throw new EngineError(`classes.${id}.ceiling is not a tier`);
    if (cls.deny_paths !== undefined) strList(cls.deny_paths, `classes.${id}.deny_paths`);
    if (cls.allow_paths !== undefined) strList(cls.allow_paths, `classes.${id}.allow_paths`);
  }
  const demotion = rec(p.demotion, 'trust-policy.demotion');
  triggerList(demotion.one_step_on, 'demotion.one_step_on');
  triggerList(demotion.quarantine_on, 'demotion.quarantine_on');
  const handsOff = rec(rec(p.envelope, 'trust-policy.envelope').hands_off, 'envelope.hands_off');
  num(handsOff.max_files, 'envelope.hands_off.max_files');
  num(handsOff.max_lines, 'envelope.hands_off.max_lines');
  strList(handsOff.environments, 'envelope.hands_off.environments');
  const req = (p.envelope as Record<string, unknown>).production_requires_proof;
  if (req !== undefined) strList(req, 'envelope.production_requires_proof');
  num(p.cooldown_days, 'trust-policy.cooldown_days');
  if (p.rerun_stats !== undefined) rerunThresholds(p.rerun_stats);
  return p as unknown as EnginePolicy;
}

export function parseState(raw: unknown): TierState {
  const s = rec(raw, 'tier-state');
  if (s.version !== 1) throw new EngineError('tier-state.version must be 1');
  for (const [agent, classes] of Object.entries(rec(s.agents, 'tier-state.agents'))) {
    for (const [cls, r] of Object.entries(rec(classes, `agents.${agent}`))) {
      const tier = isRecord(r) ? r.tier : undefined;
      if (typeof tier !== 'string' || !TIER_ORDER.includes(tier as Tier)) {
        throw new EngineError(`tier-state: ${agent}/${cls} has no valid tier`);
      }
    }
  }
  return s as unknown as TierState;
}

export function loadPolicy(ctx: Ctx, file: string): EnginePolicy {
  return parsePolicy(readYaml(ctx, file));
}

export function loadState(ctx: Ctx, file: string): TierState {
  return parseState(readYaml(ctx, file));
}
