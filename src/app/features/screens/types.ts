// What a module's screen/slices.ts exports for the screen stream (GET /api/screen/<key>): per key, the named slices
// and how each one is read on the server. A slice answers ok (plain JSON data), notFound, redirect or error; a throw
// is an error line with a fixed reason (stream.ts), never the message. Types and two small constructors only.
import type { ScreenKey } from '@/components/shell/host/model/routes';

/** One slice's answer. `data` must be plain JSON (stream.ts refuses a Map, Set, Date, function or non-finite number). */
export type SliceResult = { status: 'ok'; data: unknown } | { status: 'notFound' } | { status: 'redirect'; to: string } | { status: 'error'; reason: string };

export interface SliceCtx {
  /** The key's param ({ project: 'p1' }); empty for a key without one. */
  params: Readonly<Record<string, string>>;
  /** The page's own query (the param removed). */
  search: URLSearchParams;
  /** Aborted when the client leaves or the request ends: pass it to a slow read that can stop. */
  signal: AbortSignal;
}

export type SliceLoader = (ctx: SliceCtx) => SliceResult | Promise<SliceResult>;

export interface ScreenLoader {
  /** The slices in declared order (core first); the same names as the ScreenDef's `slices`. */
  slices: Readonly<Record<string, SliceLoader>>;
  /**
   * Reads local files or acts as the person's own logins: answer only a request addressed to this machine (notLocal).
   * true: the whole screen (one `_end` error line, reason 'not-local'); a list: only those slices answer 'not-local'.
   */
  local?: boolean | readonly string[];
}

/** A module's loaders, for the keys it owns. */
export type ModuleLoaders = Partial<Record<ScreenKey, ScreenLoader>>;

export const ok = (data: unknown): SliceResult => ({ status: 'ok', data });
export const notFound = (): SliceResult => ({ status: 'notFound' });
export const redirectTo = (to: string): SliceResult => ({ status: 'redirect', to });
