import type { ClickCopy } from './types';

export interface Proof {
  /** The issue the QA agent filed. */
  ref: string;
  title: string;
  when: string;
  edited: boolean;
}
const p = (ref: string, title: string, when: string, edited = false): Proof => ({ ref, title, when, edited });

/** Accepted proofs behind the promotion: qa.file-bug's own bug filings (illustrative). How many, and how many were edited, is the class record's (`proofsAux`, the test pins them). */
export const PROOFS: readonly Proof[] = [
  p('#231', 'Statement export 500s when the account has no transactions', 'today 09:29'),
  p('#230', 'Login form accepts a 300-character username', '1 d'),
  p('#229', 'Refund total rounds half-cent amounts the wrong way', '2 d'),
  p('#228', 'Transfer page loses the memo after a validation error', '3 d'),
  p('#227', 'Dashboard balance stale after a second tab posts a payment', '4 d'),
  p('#226', 'CSV export drops rows with a comma in the payee', '5 d'),
  p('#225', 'Date picker allows a start date after the end date', '6 d'),
  p('#224', 'Password reset link still works after the password changed', '7 d'),
  p('#223', 'Pagination skips the last page of the ledger search', '8 d'),
  p('#222', 'Currency selector resets to EUR on reload', '9 d'),
  p('#221', 'Dark mode hides the error text on the card form', '10 d'),
  p('#220', 'Duplicate submit on the payee form creates two payees', '11 d'),
  p('#219', 'Session timeout banner covers the Submit button', '12 d'),
  p('#218', 'Search ignores accents in payee names', '13 d'),
  p('#217', 'Mobile menu stays open after navigating', '14 d'),
  p('#216', 'Receipt PDF shows UTC time without the zone', '16 d'),
];

/** The proofs section's aux, from the class record: how many were accepted and what share needed no edit. */
export const proofsAux = (record: { accepted: number; noEdit: number }): string => `${record.accepted} · ${Math.round(record.noEdit * 100)} % no edit`;

/**
 * n1, "Extend trust": promote the T7 qa agent's qa.file-bug class. Its write (the branch commit of tier-state.yml and the
 * policy MR) is not written here: the server plans it from belay-policy as it is (write/promote.ts).
 */
export const PROMOTE: ClickCopy & { openedAt: string; sourceAt: string; track: string; policy: string } = {
  openedAt: '13:40',
  sourceAt: '14:21',
  track: 'T7',
  policy: 'trust-policy.yml · promotion.supervised_to_hands_off · a1b2c3',
  does: ['Opens a policy MR in belay-policy, as you', 'You merge it in GitLab', 'The next MR pipeline reads the new tier'],
  doesNot: ['change the tier now', 'merge anything for you', 'change the policy rules or any other class', 'remove the tripwire: one failure still drops it'],
};
