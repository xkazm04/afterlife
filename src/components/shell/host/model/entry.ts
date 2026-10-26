// One visited screen's read state, and how each stream line changes it. Pure: the store (hooks/store.ts) holds the
// entries and runs the reads; every rule about what a line does to what the screen shows lives here.
import { END, type SliceState, type WireLine } from './wire';

export interface ScreenEntry {
  /** The instance the slices belong to (the matched pathname): another one starts unread. */
  instance: string;
  slices: Readonly<Record<string, SliceState<unknown>>>;
  /** Each read slice's data as JSON text: an identical re-read keeps the old object (no re-render, no reseed). */
  texts: Readonly<Record<string, string>>;
  /** A slice answered notFound: the screen's NotFound draws instead of its Frame. */
  notFound: boolean;
  /** A read is in flight (the first, or a quiet revalidate). */
  reading: boolean;
  /** When the last complete read ended (its `_end` line). */
  asOf?: string;
}

export const UNREAD: SliceState<never> = Object.freeze({ state: 'unread' as const });

export function freshEntry(instance: string): ScreenEntry {
  return { instance, slices: {}, texts: {}, notFound: false, reading: false };
}

/** What a line asks of the host beyond the entry: a redirect replaces the URL. */
export type LineEffect = { redirect: string } | null;

/** Every declared slice still unread becomes an error with `reason` (a refused or failed read); read ones stay as they are. */
export function failUnread(e: ScreenEntry, declared: readonly string[], reason: string): ScreenEntry {
  const missing = declared.filter((s) => (e.slices[s]?.state ?? 'unread') === 'unread');
  if (!missing.length) return e.reading ? { ...e, reading: false } : e;
  const slices = { ...e.slices };
  for (const s of missing) slices[s] = { state: 'error', reason };
  return { ...e, slices, reading: false };
}

/**
 * The entry after one line. ok: the slice is read (the old data object kept when the text is the same); error: a slice
 * never read shows why, a read one keeps its last data (a quiet revalidate that failed never blanks a screen);
 * notFound: the screen is not found; redirect: the effect; END: the read is over, and every declared slice the stream
 * never answered fails (a refused request: with its reason; else 'not served', a loader that lacks the slice).
 */
export function applyLine(e: ScreenEntry, line: WireLine, declared: readonly string[]): { entry: ScreenEntry; effect: LineEffect } {
  if (line.slice === END) {
    const done = { ...e, reading: false, asOf: line.asOf };
    return { entry: failUnread(done, declared, line.status === 'error' ? (line.reason ?? 'unreadable') : 'not served'), effect: null };
  }
  if (line.status === 'redirect') return { entry: e, effect: line.to ? { redirect: line.to } : null };
  if (line.status === 'notFound') return { entry: { ...e, notFound: true }, effect: null };
  const prev = e.slices[line.slice];
  if (line.status === 'error') {
    if (prev?.state === 'ok') return { entry: e, effect: null };
    return { entry: { ...e, slices: { ...e.slices, [line.slice]: { state: 'error', reason: line.reason ?? 'unreadable' } } }, effect: null };
  }
  const text = line.data === undefined ? '' : JSON.stringify(line.data);
  const same = prev?.state === 'ok' && e.texts[line.slice] === text;
  const data: unknown = same ? prev.data : line.data;
  return {
    entry: { ...e, slices: { ...e.slices, [line.slice]: { state: 'ok', data, asOf: line.asOf } }, texts: { ...e.texts, [line.slice]: text } },
    effect: null,
  };
}

/** The visited keys, most recent first, with `key` moved to the front; past `cap` the oldest go (returned as evicted). */
export function visit<K>(order: readonly K[], key: K, cap: number): { order: K[]; evicted: K[] } {
  const next = [key, ...order.filter((k) => k !== key)];
  return { order: next.slice(0, cap), evicted: next.slice(cap) };
}

/** The host's visited-screen cap: past it the least recently shown screen unmounts (its state and its read go). */
export const VISITED_CAP = 10;
