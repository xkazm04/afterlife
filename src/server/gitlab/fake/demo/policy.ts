// belay-policy's two files, generated from the demo's twelve action classes: trust-policy.yml (the rules, ceilings in
// the demo's order) and tier-state.yml (where each class stands). Formatted the way the tripwire writes them.
import { DEMO } from '@/lib/demo';
import type { ActionClass } from '@/lib/demo/types';
import { parseMove } from '@/server/index/seed/parse';
import { DAY, GROUP_PATH, iso } from './ids';

/** The policy MR numbers the Ladder's seeded ledger names (ladder/data/ledgerSeed.ts). */
const PROMOTION_MR: Record<string, number> = { 'guard.block': 27, 'report.draft': 29, 'dep-bump.patch': 33, 'pipeline.retry': 35 };

const role = (a: ActionClass): { key: string; proof: string | null } => {
  const t = DEMO.tracks.find((x) => x.id === a.track);
  return { key: t?.key ?? 'unknown', proof: t && t.proof.cls !== 'ledger' ? t.proof.cls : null };
};

export function trustPolicyYaml(): string {
  const rows = DEMO.actionClasses.map((a) => {
    const r = role(a);
    const parts = [`agent: ${r.key}`, ...(r.proof ? [`proof: ${r.proof}`] : []), `ceiling: ${a.ceiling}`];
    return `  ${a.id}: { ${parts.join(', ')} }`;
  });
  return [
    '# trust-policy.yml (demo group): generated from the demo dataset, illustrative values.',
    'version: 1', 'profile: standard', 'start_tier: assisted', 'cooldown_days: 7', 'grant_ttl_days: 14',
    'promotion:',
    '  assisted_to_supervised: { accepted: 5, reverts: 0, guardrail_blocks: 0, window_last: 5 }',
    '  supervised_to_hands_off: { accepted: 15, no_edit_ratio: 0.90, clean_days: 14, human_key: true }',
    'demotion:',
    '  one_step_on: [revert, reopened_finding, post_merge_proof_fail, default_branch_red_1h]',
    '  quarantine_on: [guardrail_high, budget_breach_x2]',
    'classes:', ...rows,
    'rerun_stats: { min_runs: 5, real_failure_rate: 0.8 }',
    'envelope:',
    '  hands_off: { max_files: 6, max_lines: 120, environments: ["review/*", "staging", "production"] }',
    '  production_requires_proof: [exploit-test, rerun-stats]',
    'labels: { tier: "belay::tier::*", proof: "proof::*", guardrail: "guardrail::*" }', '',
  ].join('\n');
}

function record(a: ActionClass, anchor: Date): string {
  const move = parseMove(a.lastMove, anchor);
  const tripwire = move?.kind === 'tripwire';
  const promoted = move?.kind === 'promoted';
  const since = iso(anchor, move?.at ? move.at.getTime() - anchor.getTime() : -30 * DAY);
  const by = tripwire ? 'tripwire' : promoted ? `operator via promotion MR !${PROMOTION_MR[a.id] ?? 1}` : 'start tier + record';
  const fields = [`tier: ${a.tier}`, `since: "${since}"`, `by: "${by}"`];
  if (tripwire) fields.push('reason: guardrail_high', 'evidence: "!44"', `cooldown_until: "${iso(anchor, 7 * DAY).slice(0, 10)}"`);
  if (a.lease_days !== null) fields.push(`lease_expires: "${iso(anchor, a.lease_days * DAY)}"`);
  return `    ${a.id}: { ${fields.join(', ')} }`;
}

export function tierStateYaml(anchor: Date): string {
  const byAgent = new Map<string, string[]>();
  for (const a of DEMO.actionClasses) {
    if (a.tier === 'human_only') continue; // a person acts; tier-state has no record for it
    const key = `ai-${role(a).key}-${GROUP_PATH}`;
    byAgent.set(key, [...(byAgent.get(key) ?? []), record(a, anchor)]);
  }
  return [
    '# tier-state.yml (demo group): generated from the demo dataset, illustrative values.',
    'version: 1', 'policy_sha: a1b2c3', 'agents:',
    ...[...byAgent].flatMap(([agent, rows]) => [`  ${agent}:`, ...rows]), '',
  ].join('\n');
}
