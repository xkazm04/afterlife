// What differs between demo and live mode on this screen, as pure decisions. Demo simulates in the browser; live never
// claims what the browser did not do (Fleet's b5e2b63 made the same split).
import type { FleetProject, NeedsYouItem } from '@/lib/demo/types';
import { formatAge } from '@/lib/format/time';

export type Mode = 'demo' | 'live';

/** Live mode lists the group's own decisions only: the ids the demo seeds into an index are not the group's. */
export const visibleNeeds = (mode: Mode, needs: readonly NeedsYouItem[], isSeeded: (id: string) => boolean): readonly NeedsYouItem[] =>
  mode === 'live' ? needs.filter((n) => !isSeeded(n.id)) : needs;

/** Resolve: demo marks the decision done and counts it down here; live claims nothing and opens Needs you. */
export const resolveFor = (mode: Mode): 'simulate' | 'open-needs-you' => (mode === 'live' ? 'open-needs-you' : 'simulate');

export type RepollResult = { ok: true } | { ok: false; reason: string };

/** Re-poll: an unwatched project has nothing to poll in either mode; demo simulates; live asks the server. */
export const repollPlan = (mode: Mode, p: Pick<FleetProject, 'state'>): 'none' | 'simulate' | 'server' =>
  p.state === 'not-set-up' ? 'none' : mode === 'live' ? 'server' : 'simulate';

export const notWatchedMessage = (name: string): string => `${name}: not watched, nothing to poll`;
export const repollingMessage = (name: string): string => `Re-polling ${name}…`;

/** What a finished re-poll says: "Re-polled <name>" only when the poll succeeded, else that it failed and why. */
export const repollMessage = (name: string, r: RepollResult): string => (r.ok ? `Re-polled ${name}` : `Re-poll failed · ${name} · ${r.reason}`);

/** What a rejected server action says: the same failure sentence, with the error's message or "no answer". */
export const rejectedMessage = (name: string, e: unknown): string => repollMessage(name, { ok: false, reason: e instanceof Error ? e.message : 'no answer' });

/** Demo's simulated re-poll: only a healthy feed answers. Returns the sentence, and whether the feed age resets to 0. */
export function simulateRepoll(p: FleetProject): { message: string; reset: boolean } {
  if (!p.feed.ok) return { message: `Re-poll failed · ${p.name} · ${p.feed.error ?? 'no answer'} · last good ${formatAge(p.feed.ageSec)} ago`, reset: false };
  return { message: repollMessage(p.name, { ok: true }), reset: true };
}

export const NO_GOOD_POLL = 'no good poll yet';

/** The seconds on the counter `elapsed` s after the page had `ageSec` (null: no good poll). Demo wraps at 60; live never does. */
export function polledAge(mode: Mode, ageSec: number | null, elapsed: number): number | null {
  if (ageSec === null) return null;
  const n = ageSec + elapsed;
  return mode === 'live' ? n : n % 60;
}

/** The status line's tail: "polled 12 s ago", or that there is no good poll yet. */
export const ageLine = (age: number | null): string => (age === null ? NO_GOOD_POLL : `polled ${formatAge(age)} ago`);
