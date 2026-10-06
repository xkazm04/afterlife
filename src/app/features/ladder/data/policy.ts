// Invented constants of the demo policy (the prototype's SHAS, head and policy popover). Plain data.

/** Commit ids handed out, in order, to each revoke. */
export const COMMIT_SHAS: readonly string[] = ['e7f1', '9a20', '5bd3', '0c4e', 'b81a', '3f6d', 'd29c', '71e5', 'a4c8', '6e0b', '2d97', 'f05a'];

/** tier-state.yml head when the demo opens: the tripwire job's commit. */
export const INITIAL_HEAD = { sha: 'c3d4', by: 'tripwire' } as const;

export const POLICY = {
  version: 'v7',
  profile: 'standard',
  mergedAgo: '3 d ago',
  oneStepDown: 'revert · reopened finding · post-merge proof failure · red main ≤ 1 h after an auto-merge · 7 d cooldown',
  toQuarantined: 'guardrail high-severity block, or budget breach twice',
  envelope: '≤ 6 files · ≤ 120 lines · review/*, staging, production',
} as const;

/** Keys behind "?": [keycaps, what it does]. */
export const KEY_ROWS: readonly (readonly [readonly string[], string])[] = [
  [['j', 'k'], 'move between classes'],
  [['r'], 'revoke one step, at once'],
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
