// GET /api/screen/<key>?<query>: one screen's slices as NDJSON, a line per slice as it resolves, then `_end`
// (features/screens/stream.ts; the wire is components/shell/host/model/wire.ts). <key> is a route-table key, one
// percent-encoded segment ('fleet%2F%5Bproject%5D'); its param rides in the query under its own name. Read per
// request, never cached. A key with no loader is a 404; a param key without its param a 400. Loopback-only loaders
// (`local`) answer 'not-local' to a request that is not this machine's.
import { connection } from 'next/server';
import { loaderFor, splitQuery } from '@/app/features/screens/registry';
import { streamScreen } from '@/app/features/screens/stream';
import { ONLY } from '@/components/shell/host/model/wire';
import { notLocal } from '@/server/actions/local';

const NO_STORE = { 'cache-control': 'no-store' };

function decodeKey(raw: string): string {
  try {
    return decodeURIComponent(raw); // a no-op when the router already decoded the segment
  } catch {
    return raw;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }): Promise<Response> {
  await connection(); // request time: the data source and its data are the running server's, never the build's
  const found = loaderFor(decodeKey((await params).key));
  if (!found) return Response.json({ error: 'unknown screen' }, { status: 404, headers: NO_STORE });
  const split = splitQuery(found.key, new URL(req.url).searchParams);
  if (!split) return Response.json({ error: 'missing param' }, { status: 400, headers: NO_STORE });
  const refused = found.loader.local ? notLocal(req.headers) !== null : false;
  // a partial read (`_slices=detail,ledger`: another param on a screen that keeps its other slices) is the host's, not the page's
  const only = split.search.get(ONLY)?.split(',').filter(Boolean);
  split.search.delete(ONLY);
  const body = streamScreen(found.key, found.loader, { ...split, signal: req.signal }, refused, only);
  return new Response(body, {
    headers: { ...NO_STORE, 'content-type': 'application/x-ndjson; charset=utf-8', 'x-content-type-options': 'nosniff' },
  });
}
