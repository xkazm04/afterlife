// Run: the only way a staged write is sent. Each decision records what it wrote in "Decided this week". A policy MR (n1,
// n4) and a gap MR (g1..) is sent by the server (useNeedsYou calls confirmAction): each is one write slot (slot/slot.ts),
// and this records what the server answered, saying only what it says.
import { OPERATOR } from '../data/constants';
import { CRA } from '../data/cra';
import type { NeedsYouDemo } from '../data/types';
import type { ActionResponse } from '@/server/actions/types';
import type { WriteView } from '@/server/actions/words';
import { deskIntent } from '../write/desk';
import { notify } from './state';
import { buildOutItem, unstageItem } from './outbox/outbox';
import { isPolicyKey, POLICY_KEYS, policyTitle } from './outbox/policy';
import { isGapId } from './rows/rowState';
import { decided } from './rows/history';
import { beginSend, canAsk, canRun, needsAsk, retry, settle, shown, viewed, type SlotAnswer, type WriteSlot } from './slot/slot';
import type { NeedsState, PolicyKey } from './types';

/** The toast after a demo write ran: always names who it ran as. */
export const ranToast = (s: NeedsState, text: string): NeedsState => notify(s, 'toast', `✓ ran as ${OPERATOR} · ${text}`);

export function runItem(s: NeedsState, key: string): NeedsState {
  const item = s.out.find((o) => o.key === key);
  if (!item || isPolicyKey(key) || isGapId(key)) return s; // a policy or gap MR runs only through the server, never here
  const base: NeedsState = { ...s, out: unstageItem(s.out, key) };
  const next = { ...base, status: { ...base.status, n2: 'sent' as const }, sent: [`${item.ref} · ready to sign`, ...base.sent] };
  return ranToast(decided(next, 'signoff', `CRA early warning · ${CRA.vuln} (seeded)`, 'ready to sign', 'ledgerline#131 · label + note'), CRA.result);
}

/** Hold a write's new slot: its drawn write beside it, and the staged item redrawn from both (Run open only when ready). */
function put(s: NeedsState, key: string, slot: WriteSlot, demo: NeedsYouDemo): NeedsState {
  if (slot === s.slots?.[key]) return s;
  const view = shown(slot);
  const writes = Object.fromEntries([...Object.entries(s.writes).filter(([k]) => k !== key), ...(view ? [[key, view]] : [])]);
  const redraw = (o: NeedsState['out'][number]) => ({ ...(buildOutItem(key, demo, writes) ?? o), runnable: canRun(slot), askable: canAsk(slot) });
  return { ...s, slots: { ...s.slots, [key]: slot }, writes, out: s.out.map((o) => (o.key === key ? redraw(o) : o)) };
}

/** The server planned (or refused) a decision's write: hold it, and redraw the staged item from it. */
export const wrote = (s: NeedsState, key: string, view: WriteView, demo: NeedsYouDemo): NeedsState => put(s, key, viewed(s.slots?.[key], view), demo);

/** Run went out: one confirm, of the preview on screen. Nothing changes unless Run was open. */
export function sending(s: NeedsState, key: string, demo: NeedsYouDemo): NeedsState {
  const slot = beginSend(s.slots?.[key]);
  return slot ? put(s, key, slot, demo) : s;
}

/** A refused write, or one whose confirm got no answer, is asked for again (`keysToAsk` picks it up). */
export const retried = (s: NeedsState, key: string, demo: NeedsYouDemo): NeedsState => {
  const slot = retry(s.slots?.[key]);
  return slot ? put(s, key, slot, demo) : s;
};

const KIND: Record<PolicyKey, string> = { n1: 'promote', n4: 'readmit' };
const refOf = (a: SlotAnswer, repo: string): string => (a.simulated ? 'simulated, no MR' : a.mr ? `${repo}${a.mr}` : 'MR opened (GitLab named none)');

/** What differs between a policy MR and a gap MR: how the answer names it, and how a done one is recorded. */
function door(key: string, demo: NeedsYouDemo): { what: string; done: (s: NeedsState, a: SlotAnswer) => NeedsState } | null {
  if (isPolicyKey(key)) {
    const title = policyTitle(key, demo);
    return { what: title, done: (s, a) => {
      const ref = refOf(a, 'belay-policy');
      const next: NeedsState = { ...s, out: unstageItem(s.out, key), status: { ...s.status, [key]: 'sent' as const }, sent: [`${ref} · ${title}`, ...s.sent] };
      return decided(next, KIND[key], title, a.simulated ? 'policy MR simulated' : 'policy MR opened', `${ref} · waits for your merge`);
    } };
  }
  const g = demo.gaps.find((x) => x.id === key);
  if (!g) return null;
  const title = `${g.stage}: ${g.title}`;
  return { what: `gap ${key} · ${g.title}`, done: (s, a) => {
    const ref = refOf(a, demo.project);
    const next: NeedsState = { ...s, out: unstageItem(s.out, key), gapStatus: { ...s.gapStatus, [key]: 'sent' }, sent: [`${ref} · ${title}`, ...s.sent] };
    return decided(next, 'gaps', title, a.simulated ? 'gap MR simulated' : 'gap MR opened', `${ref} · waits for your review`);
  } };
}

/**
 * The server answered Run (or, null, the confirm got no answer). The slot settles it (slot.ts): changed shows the new
 * write, refused its reason, failed keeps it staged, no answer closes Run until it is asked for again. Done: the decision
 * is sent, naming the MR GitLab opened (or saying it was simulated, in demo). No rung moves: the next scan does that.
 */
export function ran(s: NeedsState, key: string, r: ActionResponse | null, demo: NeedsYouDemo): NeedsState {
  const d = door(key, demo);
  if (!d) return s;
  const before = s.slots?.[key];
  const slot = settle(before, r, d.what);
  const next = put(s, key, slot, demo);
  const a = slot.answer;
  if (!a || a === before?.answer) return next; // a preview is not an answer: nothing was sent
  return notify(a.status === 'done' ? d.done(next, a) : next, 'toast', a.text);
}

/** The writes to ask the server for now: in view (selected or staged), with a door, and not asked yet or asked again. */
export function keysToAsk(s: NeedsState, demo: NeedsYouDemo): string[] {
  const inView = [
    ...POLICY_KEYS.filter((k) => s.sel === k || s.status[k] === 'staged'),
    ...demo.gaps.map((g) => g.id).filter((id) => s.sel === id || s.gapStatus[id] === 'staged'),
  ];
  return inView.filter((k) => needsAsk(s.slots?.[k]) && deskIntent(k, demo) !== null);
}
