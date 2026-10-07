// The Ladder's policy words and the demo's own policy history. The rules themselves (thresholds, what demotes, the
// envelope) are trust-policy.yml's, read on the server (`PolicyRules`); only how they are worded lives here.
import type { PolicyRules } from '@/server/data/types';

/** Commit ids handed out, in order, to each simulated revoke (demo mode only: a live revoke names GitLab's commit). */
export const COMMIT_SHAS: readonly string[] = ['e7f1', '9a20', '5bd3', '0c4e', 'b81a', '3f6d', 'd29c', '71e5', 'a4c8', '6e0b', '2d97', 'f05a'];

/** tier-state.yml head when the demo opens: the tripwire job's commit. The demo's history: marked demo in live mode. */
export const INITIAL_HEAD = { sha: 'c3d4', by: 'tripwire' } as const;

/** The policy's revision and when it merged: the demo's history (the poller reads belay-policy's files, not its log). */
export const POLICY_HISTORY = { version: 'v7', mergedAgo: '3 d ago' } as const;

/** trust-policy.yml's demotion triggers, in words. */
const TRIGGER: Readonly<Record<string, string>> = {
  revert: 'revert',
  reopened_finding: 'reopened finding',
  post_merge_proof_fail: 'post-merge proof failure',
  default_branch_red_1h: 'red main ≤ 1 h',
  guardrail_high: 'guardrail high-severity block',
  budget_breach_x2: 'budget breach twice',
};
const words = (ids: readonly string[]): string => ids.map((t) => TRIGGER[t] ?? t).join(' · ');

/** The policy popover's lines, from the rules the server read. */
export function policyLines(r: PolicyRules): { oneStepDown: string; toQuarantined: string; envelope: string } {
  return {
    oneStepDown: `${words(r.oneStepOn)} · ${r.cooldownDays} d cooldown`,
    toQuarantined: words(r.quarantineOn),
    envelope: `≤ ${r.envelope.maxFiles} files · ≤ ${r.envelope.maxLines} lines · ${r.envelope.environments.join(', ')}`,
  };
}

/** Keys behind "?": [keycaps, what it does]. */
export const KEY_ROWS: readonly (readonly [readonly string[], string])[] = [
  [['j', 'k'], 'move between classes'],
  [['r'], 'revoke one step: sends the write shown'],
  [['q'], 'quarantine: read and comment only'],
  [['p'], 'promote · opens Needs you if eligible'],
  [['↵'], 'rule and write in the inspector'],
  [['/'], 'filter by name'],
  [['1', '5'], 'tier filter · 0 all'],
  [['⌘I'], 'inspector'],
  [['Esc'], 'close'],
];

export const THRESHOLD_NOTE = 'trust-policy.yml sets these thresholds; nothing measured them';
export const NO_ETA_NOTE = 'A forecast would be a claim; this is a count';
