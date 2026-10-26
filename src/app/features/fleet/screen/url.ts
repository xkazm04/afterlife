'use client';

// Fleet's own query changes (the list state, a used ?project=) written so that Next's router and the screen host both
// learn them: the history state goes without Next's private keys, so Next's patched replaceState copies them back in and
// takes the URL as its own (a router refresh elsewhere then keeps the query instead of writing Next's older URL over
// it), and the host follows the query without a re-read. Before Next has patched history (an effect while the page
// hydrates) Next's state is kept as it is, so the entry is never cut off from the app router.
const NEXT_KEYS = ['__NA', '_N', '__PRIVATE_NEXTJS_INTERNALS_TREE'];

export function replaceQuery(query: string): void {
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  const state: Record<string, unknown> = { ...(window.history.state ?? {}) };
  const patched = Object.hasOwn(window.history, 'replaceState');
  if (patched) for (const k of NEXT_KEYS) delete state[k];
  window.history.replaceState(state, '', url);
}
