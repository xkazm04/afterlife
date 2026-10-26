// trust-policy.yml's rules as the screens show them: the promotion thresholds and what demotes. Policy numbers, never a
// screen's own constants. Demo: this checkout's policy/trust-policy.yml, checked by the engine's own parser. Live: the
// trust-policy.yml the last poll read from belay-policy (poller/cycle.ts keeps it on the cycle result).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { DEMOTION_TRIGGERS, type DemotionTrigger } from '@/schemas/tier';
import { isTier } from '@/lib/promotion/enroll/enroll';
import { parsePolicy, type EnginePolicy } from '../../../engine/policy/load';
import type { PolicyRules } from './types';
import { messageOf } from '@/lib/format/error';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const triggers = (v: unknown): DemotionTrigger[] => strs(v).filter((t): t is DemotionTrigger => (DEMOTION_TRIGGERS as readonly string[]).includes(t));
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
/** A step's `gated: all`, read as guardrail_blocks is: absent (or any other value) asks nothing, so no row. */
const gatedOf = (step: { gated?: unknown } | undefined): { gated?: 'all' } => (step?.gated === 'all' ? { gated: 'all' } : {});
/** A step's `trial: {min, catches}`, read as gated is: absent, or not a positive min and a catches of 0 or more, asks nothing. */
function trialOf(step: { trial?: unknown } | undefined): { trial?: { min: number; catches: number } } {
  const t = step?.trial;
  if (typeof t !== 'object' || t === null) return {};
  const { min, catches } = t as Record<string, unknown>;
  return Number.isInteger(min) && (min as number) > 0 && Number.isInteger(catches) && (catches as number) >= 0 ? { trial: { min: min as number, catches: catches as number } } : {};
}

/** The rules a screen shows, or null when a threshold is missing (the screen then says it has no thresholds). */
export function rulesOf(p: EnginePolicy): PolicyRules | null {
  const up = p.promotion?.assisted_to_supervised;
  const top = p.promotion?.supervised_to_hands_off;
  const ho = p.envelope?.hands_off;
  const accS = num(up?.accepted);
  const revS = num(up?.reverts);
  const accH = num(top?.accepted);
  const noEdit = num(top?.no_edit_ratio);
  const clean = num(top?.clean_days);
  const cooldown = num(p.cooldown_days);
  const blocks = num(up?.guardrail_blocks);
  const window = num(up?.window_last);
  if (accS === null || revS === null || accH === null || noEdit === null || clean === null || cooldown === null || !ho) return null;
  return {
    profile: typeof p.profile === 'string' ? p.profile : null,
    startTier: isTier(p.start_tier) ? p.start_tier : null,
    cooldownDays: cooldown,
    leaseDays: num(p.grant_ttl_days),
    toSupervised: { accepted: accS, reverts: revS, guardrailBlocks: blocks, windowLast: window !== null && Number.isInteger(window) && window > 0 ? window : null, ...gatedOf(up), ...trialOf(up) },
    toHandsOff: { accepted: accH, noEditRatio: noEdit, cleanDays: clean, humanKey: top?.human_key === true, ...gatedOf(top), ...trialOf(top) },
    oneStepOn: triggers(p.demotion?.one_step_on),
    quarantineOn: triggers(p.demotion?.quarantine_on),
    envelope: { maxFiles: num(ho.max_files) ?? 0, maxLines: num(ho.max_lines) ?? 0, environments: strs(ho.environments) },
  };
}

let cached: { root: string; rules: PolicyRules | null } | null = null;

/** policy/trust-policy.yml of this checkout (read once). Null when it is missing or the engine refuses it. */
export function repoPolicy(root: string = process.cwd()): PolicyRules | null {
  if (cached?.root === root) return cached.rules;
  let rules: PolicyRules | null = null;
  try {
    rules = rulesOf(parsePolicy(parse(fs.readFileSync(path.join(root, 'policy', 'trust-policy.yml'), 'utf8'))));
  } catch (e) {
    rules = null;
    console.warn(`afterlife: no trust policy from ${path.join(root, 'policy', 'trust-policy.yml')}: ${messageOf(e)}`); // once per root: the cache below
  }
  cached = { root, rules };
  return rules;
}
