// Re-polling a feed and the status line.
import type { FleetProject } from '@/lib/demo/types';
import { formatAge } from '@/lib/format/time';

export interface RepollResult {
  ok: boolean;
  message: string;
  project: FleetProject;
}

/** What a re-poll says: "Re-polled <name>" only when the poll succeeded, else that it failed and why. */
export const repollMessage = (name: string, r: { ok: true } | { ok: false; reason: string }): string =>
  r.ok ? `Re-polled ${name}` : `Re-poll failed · ${name} · ${r.reason || 'no answer'}`;

/**
 * Demo mode's re-poll, simulated in the browser: it only succeeds on a watched project whose feed is healthy, which then
 * has age 0. Live mode polls on the server instead (`hooks/useRepoll`); an unwatched project has nothing to poll in both.
 */
export function repoll(p: FleetProject): RepollResult {
  if (p.state === 'not-set-up') return { ok: false, message: `${p.name}: not watched, nothing to poll`, project: p };
  if (!p.feed.ok) return { ok: false, message: repollMessage(p.name, { ok: false, reason: p.feed.error ?? '' }), project: p };
  return { ok: true, message: repollMessage(p.name, { ok: true }), project: { ...p, feed: { ...p.feed, ageSec: 0 } } };
}

/**
 * "184 projects · 0 filters · polled 12 s ago" (or "9 of 184 projects"); a live age past a minute in the feed's units, "2 h".
 * No poll read yet (null) says so, never "polled 0 s ago".
 */
export function statusLine(shown: number, total: number, filters: number, polledSec: number | null): string {
  const count = shown === total ? `${total}` : `${shown} of ${total}`;
  return `${count} ${total === 1 ? 'project' : 'projects'} · ${filters} ${filters === 1 ? 'filter' : 'filters'} · ${polledSec === null ? 'not polled yet' : `polled ${formatAge(polledSec)} ago`}`;
}

/**
 * The "polled N s ago" counter, one second on. Demo: it wraps after 59, as the prototype does (a poll a minute, simulated).
 * Live: it only grows, from the snapshot's age, until the page has a fresher snapshot (a re-poll or a reload): nothing
 * polls in the browser.
 */
export const nextPolled = (n: number, live = false): number => (live ? n + 1 : n >= 59 ? 0 : n + 1);
