// Run: the only way a staged write is sent. Each decision records what it wrote in "Decided this week". A policy MR (n1,
// n4) is sent by the server (useNeedsYou calls confirmAction), and this records its answer, saying only what it says.
import { OPERATOR } from '../data/constants';
import { CRA } from '../data/cra';
import { GAP_DETAIL } from '../data/gaps';
import type { NeedsYouDemo } from '../data/types';
import type { ActionResponse } from '@/server/actions/types';
import { mrOf, outcomeOf, type WriteView } from '@/server/actions/words';
import { notify } from './state';
import { buildOutItem, unstageItem } from './outbox/outbox';
import { isPolicyKey, policyTitle } from './outbox/policy';
import { decided } from './rows/history';
import type { NeedsState, PolicyKey } from './types';

/** The toast after a demo write ran: always names who it ran as. */
export const ranToast = (s: NeedsState, text: string): NeedsState => notify(s, 'toast', `✓ ran as ${OPERATOR} · ${text}`);

export function runItem(s: NeedsState, key: string): NeedsState {
  const item = s.out.find((o) => o.key === key);
  if (!item || isPolicyKey(key)) return s; // a policy MR runs only through the server, never here
  const base: NeedsState = { ...s, out: unstageItem(s.out, key) };
  if (key === 'n2') {
    const next = { ...base, status: { ...base.status, n2: 'sent' as const }, sent: [`${item.ref} · ready to sign`, ...base.sent] };
    return ranToast(decided(next, 'signoff', `CRA early warning · ${CRA.vuln} (seeded)`, 'ready to sign', 'ledgerline#131 · label + note'), CRA.result);
  }
  const next = { ...base, gapStatus: { ...base.gapStatus, [key]: 'sent' as const }, sent: [`${item.ref} · ${item.title}`, ...base.sent] };
  const ref = GAP_DETAIL.mrNo[key] ?? item.ref;
  return ranToast(decided(next, 'gaps', item.title, 'picked · 1 write', `${ref} · waits for your review`), `${ref} opened · ${item.title}`);
}

/** The server planned (or refused) a policy-MR write: hold it, and redraw the staged item from it. */
export function wrotePolicy(s: NeedsState, key: PolicyKey, view: WriteView, demo: NeedsYouDemo): NeedsState {
  const writes = { ...s.writes, [key]: view };
  const out = s.out.map((o) => (o.key === key ? (buildOutItem(key, demo, writes) ?? o) : o));
  return { ...s, writes, out };
}

const KIND: Record<PolicyKey, string> = { n1: 'promote', n4: 'readmit' };

/**
 * The server answered Run. Done: the decision is sent, naming the MR GitLab opened, or saying it was simulated (demo).
 * Changed: the new write replaces the old one and nothing ran. Refused: the reason replaces the write. Failed: it stays
 * staged and the toast says what GitLab answered.
 */
export function ranPolicy(s: NeedsState, key: PolicyKey, r: ActionResponse, demo: NeedsYouDemo): NeedsState {
  const title = policyTitle(key, demo);
  const o = outcomeOf(r, title);
  if (!o) return s;
  if (o.status === 'changed') return notify(wrotePolicy(s, key, { kind: 'preview', preview: o.preview }, demo), 'toast', o.text);
  if (o.status === 'refused') return notify(wrotePolicy(s, key, { kind: 'refused', reason: o.reason }, demo), 'toast', o.text);
  if (o.status === 'failed') return notify(s, 'toast', o.text);
  const mr = r.status === 'done' ? mrOf(r.results) : null;
  const ref = o.simulated ? 'simulated, no MR' : mr ? `belay-policy${mr}` : 'MR opened (GitLab named none)';
  const result = o.simulated ? 'policy MR simulated' : 'policy MR opened';
  const next: NeedsState = {
    ...s, out: unstageItem(s.out, key), status: { ...s.status, [key]: 'sent' as const }, sent: [`${ref} · ${title}`, ...s.sent],
  };
  return notify(decided(next, KIND[key], title, result, `${ref} · waits for your merge`), 'toast', o.text);
}
