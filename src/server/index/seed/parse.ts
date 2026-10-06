// Turns the demo fixture's display strings back into instants, relative to a fixed "now". The index stores
// instants and deadlines; the views turn them into the same strings, so the round trip is exact.
import type { ClassTierRow } from '../repositories/fleet/classTier';
import type { TaskState } from '../repositories/work/task';

/** portfolio.asOf in the fixture is 14:22. */
export const SEED_NOW = new Date('2026-10-06T14:22:00.000Z');

const UNIT_MS: Record<string, number> = { min: 60_000, h: 3_600_000, d: 86_400_000 };

/** "14:21" on the same UTC day as `now`. */
export function onDayAt(now: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setUTCHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/** "19 h 12 m" -> milliseconds. */
export function countdownMs(text: string): number {
  const m = /^(?:(\d+) h )?(\d+) m$/.exec(text);
  if (!m) throw new Error(`seed: cannot read countdown "${text}"`);
  return (Number(m[1] ?? 0) * 60 + Number(m[2])) * 60_000;
}

/** The fixture's lastMove sentences, as a structured move. null = no change. */
export function parseMove(text: string, now: Date): ClassTierRow['move'] {
  const at = (n: string, u: string): Date => new Date(now.getTime() - Number(n) * (UNIT_MS[u] ?? 0));
  let m: RegExpExecArray | null;
  if (text === 'no change') return null;
  if ((m = /^promoted (\d+) (min|h|d) ago$/.exec(text))) return { kind: 'promoted', at: at(m[1] as string, m[2] as string), note: null };
  if ((m = /^demoted (.+) (\d+) (min|h|d) ago$/.exec(text))) return { kind: 'demoted', at: at(m[2] as string, m[3] as string), note: m[1] as string };
  if ((m = /^(\d+) (min|h|d) ago · tripwire$/.exec(text))) return { kind: 'tripwire', at: at(m[1] as string, m[2] as string), note: null };
  if (/^record \d+ \/ \d+ · not eligible$/.test(text)) return { kind: 'ineligible', at: null, note: null };
  return { kind: 'note', at: null, note: text };
}

/** A coarse state for the fixture's free-text task states; the text itself is kept in state_label. */
export function taskState(label: string): TaskState {
  if (label.startsWith('merged')) return 'merged';
  if (label.startsWith('blocked')) return 'blocked';
  if (label.startsWith('reverted')) return 'reverted';
  return 'proved';
}
