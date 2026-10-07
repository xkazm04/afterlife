import type { ClickCopy } from './types';

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

/**
 * n1, "Extend trust": promote the T1 patcher's dep-bump class. Its write (the branch commit of tier-state.yml and the
 * policy MR) is not written here: the server plans it from belay-policy as it is (write/promote.ts).
 */
export const PROMOTE: ClickCopy & { openedAt: string; sourceAt: string; track: string; policy: string } = {
  openedAt: '13:40',
  sourceAt: '14:21',
  track: 'T1',
  policy: 'trust-policy.yml · promotion.supervised_to_hands_off · a1b2c3',
  does: ['Opens a policy MR in belay-policy, as you', 'You merge it in GitLab', 'The next MR pipeline reads the new tier'],
  doesNot: ['change the tier now', 'merge anything for you', 'touch code-fix.patch or the policy rules', 'remove the tripwire: one failure still drops it'],
};
