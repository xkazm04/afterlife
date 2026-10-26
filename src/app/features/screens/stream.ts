// A ScreenLoader as an NDJSON stream: every slice starts at once (in declared order, so a sync core is the first line)
// and is written the moment it resolves; then the `_end` line. A slice that throws is an error line with a fixed
// reason (a NotReadyError's own message, which names no path; anything else 'unreadable', its message only in the
// server log). Data that JSON would change (a Set, Map, Date, function, non-finite number) is refused the same way.
// The request's abort stops the writing.
import { END, lineText, NOT_LOCAL, type WireLine } from '@/components/shell/host/model/wire';
import { messageOf } from '@/lib/format/error';
import { NotReadyError } from '@/server/data';
import type { ScreenLoader, SliceCtx, SliceResult } from './types';

/** The first value JSON would lose or change, as a path ('data.start.collapsed'), or null when it is plain data. */
export function unserialisable(v: unknown, path = 'data'): string | null {
  if (v === null || v === undefined || typeof v === 'string' || typeof v === 'boolean') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? null : path;
  if (typeof v !== 'object') return path;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const bad = unserialisable(v[i], `${path}[${i}]`);
      if (bad) return bad;
    }
    return null;
  }
  const proto: unknown = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return path;
  for (const [k, x] of Object.entries(v)) {
    const bad = unserialisable(x, `${path}.${k}`);
    if (bad) return bad;
  }
  return null;
}

function lineOf(slice: string, r: SliceResult, asOf: string, where: string): WireLine {
  if (r.status === 'ok') {
    const bad = unserialisable(r.data);
    if (!bad) return r.data === undefined ? { slice, status: 'ok', asOf } : { slice, status: 'ok', data: r.data as WireLine['data'], asOf };
    console.error(`belay: ${where} slice ${slice}: ${bad} is not plain JSON`);
    return { slice, status: 'error', reason: 'unreadable', asOf };
  }
  if (r.status === 'redirect') return { slice, status: 'redirect', to: r.to, asOf };
  if (r.status === 'error') return { slice, status: 'error', reason: r.reason, asOf };
  return { slice, status: 'notFound', asOf };
}

function failed(slice: string, e: unknown, where: string): WireLine {
  const asOf = new Date().toISOString();
  if (e instanceof NotReadyError) return { slice, status: 'error', reason: e.message, asOf };
  console.error(`belay: ${where} slice ${slice} could not be read: ${messageOf(e)}`);
  return { slice, status: 'error', reason: 'unreadable', asOf };
}

/**
 * The stream for `key`'s loader. `refused`: the request is not this machine's and the loader is `local`; a
 * whole-screen refusal is one `_end` error line, a per-slice one answers those slices 'not-local'. `only`: answer just
 * those slices (a partial read, the client's `_slices`); a name the loader lacks is ignored.
 */
export function streamScreen(key: string, loader: ScreenLoader, ctx: SliceCtx, refused = false, only?: readonly string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const where = `/api/screen/${key}`;
  let open = true;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (line: WireLine) => {
        if (!open) return;
        controller.enqueue(enc.encode(lineText(line)));
      };
      const close = () => {
        if (!open) return;
        open = false;
        controller.close();
      };
      ctx.signal.addEventListener('abort', close, { once: true });
      if (refused && loader.local === true) {
        write({ slice: END, status: 'error', reason: NOT_LOCAL, asOf: new Date().toISOString() });
        return close();
      }
      const blocked = new Set(refused && Array.isArray(loader.local) ? (loader.local as readonly string[]) : []);
      const runs = Object.entries(loader.slices).filter(([slice]) => !only || only.includes(slice)).map(async ([slice, load]) => {
        try {
          const r = await (blocked.has(slice) ? ({ status: 'error', reason: NOT_LOCAL } as const) : load(ctx));
          write(lineOf(slice, r, new Date().toISOString(), where));
        } catch (e) {
          if (!ctx.signal.aborted) write(failed(slice, e, where));
        }
      });
      void Promise.all(runs).then(() => {
        write({ slice: END, status: 'ok', asOf: new Date().toISOString() });
        close();
      });
    },
    cancel() {
      open = false;
    },
  });
}
