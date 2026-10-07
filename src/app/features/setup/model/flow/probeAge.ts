import { STALE_AFTER_MS } from '../../data/timing';
import type { SetupState } from '../types';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The demo clock: `baseMin` minutes after midnight at `startMs`, then real minutes. "14:02". */
export function clockLabel(baseMin: number, startMs: number, nowMs: number): string {
  const m = baseMin + Math.floor(Math.max(0, nowMs - startMs) / 60000);
  return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;
}

/** "12 s ago" or "2 m 05 s ago". */
export function formatAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} s ago` : `${Math.floor(s / 60)} m ${pad2(s % 60)} s ago`;
}

/** A doctor probe is stale after two minutes: drawn amber, with its age. */
export const isStale = (s: SetupState, nowMs: number): boolean => nowMs - s.doctorAt > STALE_AFTER_MS;

/**
 * The status bar's probe sentence. A never-probed group says so and shows no age. A failed probe says failed, with its
 * time and age, and is drawn amber like a stale one: it is never shown as a fresh probe.
 */
export function probeAgeText(s: SetupState, nowMs: number): { text: string; stale: boolean } {
  if (s.doctorNever) return { text: `belay doctor · ${s.group} · never probed`, stale: false };
  if (s.doctorError) return { text: `belay doctor · probe failed ${s.doctorProbedAt} · ${formatAgo(nowMs - s.doctorAt)}`, stale: true };
  const stale = isStale(s, nowMs);
  return { text: `belay doctor · ${stale ? 'stale · ' : ''}probed ${s.doctorProbedAt} · ${formatAgo(nowMs - s.doctorAt)}`, stale };
}
