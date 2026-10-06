import type { ClickCopy, DiffLine, WriteSpec } from './types';

export interface Proof {
  mr: string;
  title: string;
  when: string;
  edited: boolean;
}
const p = (mr: string, title: string, when: string, edited = false): Proof => ({ mr, title, when, edited });

/** The 16 accepted proofs behind the promotion (illustrative). */
export const PROOFS: readonly Proof[] = [
  p('!41', 'Fix path traversal in statement export', 'today 09:29'),
  p('!40', 'Bump jackson-databind 2.17.1 → 2.17.2', '1 d'),
  p('!37', 'Bump netty-codec-http 4.1.112 → 4.1.115', '2 d'),
  p('!36', 'Bump logback-core 1.5.6 → 1.5.8', '3 d'),
  p('!35', 'Bump commons-io 2.16.0 → 2.16.1', '4 d'),
  p('!34', 'Bump snakeyaml 2.2 → 2.3', '5 d'),
  p('!33', 'Bump postgresql 42.7.2 → 42.7.4', '6 d'),
  p('!32', 'Bump guava 33.1.0 → 33.2.1', '7 d'),
  p('!31', 'Bump bouncycastle 1.77 → 1.78.1', '8 d'),
  p('!30', 'Bump spring-web 6.1.6 → 6.1.12', '9 d', true),
  p('!29', 'Bump nimbus-jose-jwt 9.37 → 9.40', '10 d'),
  p('!28', 'Bump h2 2.2.224 → 2.3.232', '11 d'),
  p('!27', 'Bump okhttp 4.12.0 → 4.12.1', '12 d'),
  p('!26', 'Bump json-smart 2.5.0 → 2.5.1', '13 d'),
  p('!25', 'Bump xmlsec 3.0.3 → 3.0.4', '14 d'),
  p('!24', 'Bump zookeeper 3.9.1 → 3.9.2', '16 d'),
];

const diff: readonly DiffLine[] = [
  [' ', 'agents:'],
  [' ', '  ai-patcher-acme:'],
  ['-', '    dep-bump.patch: { tier: supervised, by: "start tier + record" }'],
  ['+', '    dep-bump.patch: { tier: hands_off, by: "@operator via promotion MR belay-policy!21", lease_days: 14 }'],
  [' ', '    code-fix.patch: { tier: supervised, by: "start tier + record" }'],
];

const write: WriteSpec = {
  ref: 'belay-policy!21',
  file: 'belay-policy/tier-state.yml',
  diff,
  commands: [
    'git -C belay-policy switch -c belay/promote-patcher-dep-bump',
    'git -C belay-policy commit -am "Promote ai-patcher-acme dep-bump.patch: supervised → hands_off"',
    'git -C belay-policy push -u origin belay/promote-patcher-dep-bump',
    'glab mr create -R acme-lab/belay-policy --title "Promote ai-patcher-acme dep-bump.patch: supervised → hands_off" --description-file record-16-proofs.md',
  ],
  result: 'belay-policy!21 opened as @operator. The tier is still SUPERVISED until you merge it.',
};

/** n1, "Extend trust": promote the T1 patcher's dep-bump class. */
export const PROMOTE: ClickCopy & { openedAt: string; sourceAt: string; track: string; policy: string; write: WriteSpec } = {
  openedAt: '13:40',
  sourceAt: '14:21',
  track: 'T1',
  policy: 'trust-policy.yml · promotion.supervised_to_hands_off · a1b2c3',
  write,
  does: ['Opens a policy MR in belay-policy, as you', 'You merge it in GitLab', 'The next MR pipeline reads the new tier'],
  doesNot: ['change the tier now', 'merge anything for you', 'touch code-fix.patch or the policy rules', 'remove the tripwire: one failure still drops it'],
};
