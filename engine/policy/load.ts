// Loads and validates policy/trust-policy.yml and policy/tier-state.yml. The files are structured data
// a person reviews; the engine refuses a malformed one instead of guessing what it meant.
import { PROOF_CLASSES } from '../../src/schemas/proof';
import { DEMOTION_TRIGGERS, TIER_ORDER, type Tier, type TierState, type TrustPolicy } from '../../src/schemas/tier';
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

export { DEMOTION_TRIGGERS };

/** A trigger the tripwire never fires would sit in the policy doing nothing, so a typo there silently disarms the demotion. */
function triggerList(v: unknown, what: string): void {
  const unknown = strList(v, what).filter((t) => !(DEMOTION_TRIGGERS as readonly string[]).includes(t));
  if (unknown.length) throw new EngineError(`${what} names ${unknown.map((t) => `"${t}"`).join(', ')}, which is not a demotion trigger (${DEMOTION_TRIGGERS.join(', ')})`);
}

/** A proof name the engine has no class for: the gate would block every proof of that class, and production would stay shut. */
const isProof = (v: unknown): boolean => (PROOF_CLASSES as readonly unknown[]).includes(v);

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
    if (cls.proof !== undefined && !isProof(cls.proof)) throw new EngineError(`classes.${id}.proof "${String(cls.proof)}" is not a proof class (${PROOF_CLASSES.join(', ')})`);
  }
  const demotion = rec(p.demotion, 'trust-policy.demotion');
  triggerList(demotion.one_step_on, 'demotion.one_step_on');
  triggerList(demotion.quarantine_on, 'demotion.quarantine_on');
  const handsOff = rec(rec(p.envelope, 'trust-policy.envelope').hands_off, 'envelope.hands_off');
  num(handsOff.max_files, 'envelope.hands_off.max_files');
  num(handsOff.max_lines, 'envelope.hands_off.max_lines');
  strList(handsOff.environments, 'envelope.hands_off.environments');
  const req = (p.envelope as Record<string, unknown>).production_requires_proof;
  const stray = req === undefined ? [] : strList(req, 'envelope.production_requires_proof').filter((c) => !isProof(c));
  if (stray.length) throw new EngineError(`envelope.production_requires_proof names ${stray.map((c) => `"${c}"`).join(', ')}, which is not a proof class (${PROOF_CLASSES.join(', ')})`);
  // a negative cooldown stamps cooldown_until before the demotion's own day: the hold on re-promotion is off
  if (num(p.cooldown_days, 'trust-policy.cooldown_days') < 0) throw new EngineError('trust-policy.cooldown_days must be 0 or more');
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
