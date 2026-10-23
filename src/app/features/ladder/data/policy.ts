// The Ladder's policy words and the demo's own policy history. The rules themselves (thresholds, what demotes, the
// envelope) are trust-policy.yml's, read on the server (`PolicyRules`); only how they are worded lives here.
import { TRIGGER_WORDS } from '@/lib/promotion/trigger/trigger';
import type { PolicyRules } from '@/server/data/types';

/** Commit ids handed out, in order, to each simulated revoke (demo mode only: a live revoke names GitLab's commit). */
export const COMMIT_SHAS: readonly string[] = ['e7f1', '9a20', '5bd3', '0c4e', 'b81a', '3f6d', 'd29c', '71e5', 'a4c8', '6e0b', '2d97', 'f05a'];

/** tier-state.yml head when the demo opens: the tripwire job's commit. The demo's history: marked demo in live mode. */
export const INITIAL_HEAD = { sha: 'c3d4', by: 'tripwire' } as const;

/** The policy's revision and when it merged: the demo's history (the poller reads belay-policy's files, not its log). */
export const POLICY_HISTORY = { version: 'v7', mergedAgo: '3 d ago' } as const;

/** An empty trigger list is a rule too: nothing demotes that way, and the line says so. */
const words = (ids: readonly string[]): string => (ids.length ? ids.map((t) => TRIGGER_WORDS[t] ?? t).join(' · ') : 'no trigger');

/** The policy popover's lines, from the rules the server read. */
export function policyLines(r: PolicyRules): { oneStepDown: string; toQuarantined: string; envelope: string } {
  return {
    oneStepDown: `${words(r.oneStepOn)} · ${r.cooldownDays} d cooldown`,
    toQuarantined: words(r.quarantineOn),
    envelope: `≤ ${r.envelope.maxFiles} files · ≤ ${r.envelope.maxLines} lines · ${r.envelope.environments.length ? r.envelope.environments.join(', ') : 'no environment'}`,
  };
}

/** Keys behind "?": [keycaps, what it does]. */
export const KEY_ROWS: readonly (readonly [readonly string[], string])[] = [
  [['j', 'k'], 'move between classes'],
  [['r'], 'revoke one step: sends the write shown'],
  [['q'], 'quarantine: read and comment only'],
  [['p'], 'promote or re-admit · sends the policy MR on screen'],
  [['↵'], 'open the class page: rule and write'],
  [['/'], 'filter by name'],
  [['1', '5'], 'tier filter · 0 all'],
  [['Esc'], 'close'],
];

export const THRESHOLD_NOTE = 'trust-policy.yml sets these thresholds; nothing measured them';
export const NO_ETA_NOTE = 'A forecast would be a claim; this is a count';
