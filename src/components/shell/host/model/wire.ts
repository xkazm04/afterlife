// The screen stream's wire (GET /api/screen/<key>?<query>, NDJSON): one line per slice as it resolves, then the `_end`
// line. Pure and shared: the server writes these lines (src/app/features/screens/stream.ts), the client reads them
// (hooks/readStream.ts). An absent value is an omitted key, never null or 0; only JSON-serialisable data travels.
import { paramOf, type ScreenKey } from './routes';

/** Plain JSON: what a slice's data may hold (no Map, Set, Date, function or class instance; convert at the edge). */
export type Json = string | number | boolean | null | readonly Json[] | { readonly [k: string]: Json | undefined };

export type LineStatus = 'ok' | 'notFound' | 'redirect' | 'error';

/** One NDJSON line. `slice` is a slice name, or END for the terminator. */
export interface WireLine {
  slice: string;
  status: LineStatus;
  data?: Json;
  /** redirect: the in-app href to replace the URL with. */
  to?: string;
  /** error: a fixed, non-leaky reason ('not-local', 'unreadable', or a NotReadyError's own message). */
  reason?: string;
  /** When the server answered this line (ISO-8601). */
  asOf: string;
}

/** The terminator line's slice name: the stream is complete after it. */
export const END = '_end';

/** The reason every slice of a loopback-only screen answers to a request that is not this machine's. */
export const NOT_LOCAL = 'not-local';

/** A slice as a screen reads it (useSlice): not read yet, read (with when), or failed (why). */
export type SliceState<T> = { state: 'unread' } | { state: 'ok'; data: T; asOf: string } | { state: 'error'; reason: string };

const STATUSES: readonly string[] = ['ok', 'notFound', 'redirect', 'error'];

/** A parsed line when it has the wire's shape, else null (a torn or foreign line is dropped, never guessed at). */
export function toWireLine(v: unknown): WireLine | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.slice !== 'string' || typeof o.status !== 'string' || !STATUSES.includes(o.status) || typeof o.asOf !== 'string') return null;
  if (o.to !== undefined && typeof o.to !== 'string') return null;
  if (o.reason !== undefined && typeof o.reason !== 'string') return null;
  return o as unknown as WireLine;
}

/** A line as the server writes it: JSON plus the newline that ends it. */
export function lineText(line: WireLine): string {
  return `${JSON.stringify(line)}\n`;
}

/**
 * The stream's URL for a key: its param under the param's name, beside the page's own query (the param wins a clash).
 * The key is one path segment, percent-encoded ('fleet/[project]' -> 'fleet%2F%5Bproject%5D').
 */
export function screenUrl(key: ScreenKey, params: Readonly<Record<string, string>>, search: URLSearchParams | string = ''): string {
  const q = new URLSearchParams(search);
  const name = paramOf(key);
  if (name && params[name] !== undefined) q.set(name, params[name]);
  const qs = q.toString();
  return `/api/screen/${encodeURIComponent(key)}${qs ? `?${qs}` : ''}`;
}

/**
 * Splits a byte stream's text into whole lines: feed() each decoded chunk and get the lines it completed; a line torn
 * across chunks waits for its end. flush() hands back a last line that had no newline.
 */
export function lineSplitter(): { feed: (chunk: string) => string[]; flush: () => string[] } {
  let rest = '';
  return {
    feed(chunk) {
      rest += chunk;
      const parts = rest.split('\n');
      rest = parts.pop() ?? '';
      return parts.filter((p) => p.trim() !== '');
    },
    flush() {
      const last = rest.trim();
      rest = '';
      return last ? [last] : [];
    },
  };
}
