// The decisions waiting for a person: the lozenge count, resolving one, re-polling a feed, the status line.
import type { FleetProject } from '@/lib/demo/types';

/** Waiting decisions across watched projects (an unwatched project has no live count). */
export const waitingCount = (projects: readonly FleetProject[]): number =>
  projects.filter((p) => p.state !== 'not-set-up').reduce((a, p) => a + p.needsYou, 0);

/** Resolving a decision lowers its project's count by one, never below zero. */
export const resolveOne = (p: FleetProject): FleetProject => ({ ...p, needsYou: Math.max(0, p.needsYou - 1) });

export interface RepollResult {
  ok: boolean;
  message: string;
  project: FleetProject;
}

/** A re-poll only succeeds on a watched project whose feed is healthy; it then has age 0. */
export function repoll(p: FleetProject): RepollResult {
  if (p.state === 'not-set-up') return { ok: false, message: `${p.name}: not watched, nothing to poll`, project: p };
  if (!p.feed.ok) return { ok: false, message: `Re-poll failed · ${p.name} · ${p.feed.error ?? 'no answer'}`, project: p };
  return { ok: true, message: `Re-polled ${p.name}`, project: { ...p, feed: { ...p.feed, ageSec: 0 } } };
}

/** "184 projects · 0 filters · polled 12 s ago" (or "9 of 184 projects"). */
export function statusLine(shown: number, total: number, filters: number, polledSec: number): string {
  const count = shown === total ? `${total}` : `${shown} of ${total}`;
  return `${count} projects · ${filters} ${filters === 1 ? 'filter' : 'filters'} · polled ${polledSec} s ago`;
}

/** The "polled N s ago" counter: counts up and wraps after 59, as the prototype does. */
export const nextPolled = (n: number): number => (n >= 59 ? 0 : n + 1);
