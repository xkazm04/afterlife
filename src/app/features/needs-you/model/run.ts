// Run: the only way a staged write is sent. Each decision records what it wrote in "Decided this week".
import { OPERATOR } from '../data/constants';
import { CRA } from '../data/cra';
import { GAP_DETAIL } from '../data/gaps';
import { PROMOTE } from '../data/promote';
import { READMIT } from '../data/readmit';
import { notify } from './state';
import { unstageItem } from './outbox/outbox';
import { decided } from './rows/history';
import type { NeedsState } from './types';

/** The toast after a write ran: always names who it ran as. */
export const ranToast = (s: NeedsState, text: string): NeedsState => notify(s, 'toast', `✓ ran as ${OPERATOR} · ${text}`);

export function runItem(s: NeedsState, key: string): NeedsState {
  const item = s.out.find((o) => o.key === key);
  if (!item) return s;
  const base: NeedsState = { ...s, out: unstageItem(s.out, key) };
  if (key === 'n2') {
    const next = { ...base, status: { ...base.status, n2: 'sent' as const }, sent: [`${item.ref} · ready to sign`, ...base.sent] };
    return ranToast(decided(next, 'signoff', `CRA early warning · ${CRA.vuln} (seeded)`, 'ready to sign', 'ledgerline#131 · label + note'), CRA.result);
  }
  if (key === 'n1') {
    const next = { ...base, status: { ...base.status, n1: 'sent' as const }, sent: [`${item.ref} · promotion MR opened`, ...base.sent] };
    return ranToast(decided(next, 'promote', 'dep-bump.patch · T1 patcher', 'policy MR opened', 'belay-policy!21 · waits for your merge'), PROMOTE.write.result);
  }
  if (key === 'n4') {
    const next = { ...base, status: { ...base.status, n4: 'sent' as const }, sent: [`${item.ref} · re-admission MR opened`, ...base.sent] };
    return ranToast(decided(next, 'readmit', 'patch-bump · T8 gardener', 'Q → A (MR)', 'belay-policy!22 · waits for your merge'), READMIT.readmit.result);
  }
  const next = { ...base, gapStatus: { ...base.gapStatus, [key]: 'sent' as const }, sent: [`${item.ref} · ${item.title}`, ...base.sent] };
  const ref = GAP_DETAIL.mrNo[key] ?? item.ref;
  return ranToast(decided(next, 'gaps', item.title, 'picked · 1 write', `${ref} · waits for your review`), `${ref} opened · ${item.title}`);
}
