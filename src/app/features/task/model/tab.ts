// The Task pane's three views under the verdict, and their address: ?tab=chain or ?tab=ledger; the Court is the bare URL.
// Pure: the route reads the opening tab on the server, the screen writes it back with the selection.
import { firstParam } from '@/lib/url/searchParams';

export type TaskTab = 'court' | 'chain' | 'ledger';

/** The tabs in reading order: the claims against the checks first, then the receipts, then the rows that keep them. */
export const TASK_TABS: readonly { key: TaskTab; label: string }[] = [
  { key: 'court', label: 'Court' },
  { key: 'chain', label: 'Receipt chain' },
  { key: 'ledger', label: 'Ledger' },
];

/** The query key the tab owns. */
export const TAB_KEY = 'tab';

export interface TabQuery {
  tab?: string | string[];
}

/** The tab a URL asks for; anything but chain or ledger (absent, misspelt, repeated court) is the Court. */
export function tabFromQuery(q: TabQuery): TaskTab {
  const tab = firstParam(q.tab);
  return tab === 'chain' || tab === 'ledger' ? tab : 'court';
}

/** `href` with the tab's key: added for chain or ledger, none for the Court. */
export function withTab(href: string, tab: TaskTab): string {
  if (tab === 'court') return href;
  return `${href}${href.includes('?') ? '&' : '?'}${TAB_KEY}=${tab}`;
}

/** Where a tablist key moves from `tab`: ← → one over (clamped, not wrapping), Home and End to the ends; null for any other key. */
export function stepTab(tab: TaskTab, key: string): TaskTab | null {
  const i = TASK_TABS.findIndex((t) => t.key === tab);
  const to = key === 'ArrowRight' ? i + 1 : key === 'ArrowLeft' ? i - 1 : key === 'Home' ? 0 : key === 'End' ? TASK_TABS.length - 1 : null;
  if (to === null) return null;
  return TASK_TABS[Math.max(0, Math.min(TASK_TABS.length - 1, to))]?.key ?? tab;
}
