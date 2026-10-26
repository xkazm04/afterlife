// GET /api/start/probe: /start's live checks, streamed (features/start/data/probe.ts), one ProbeEvent per line as
// application/x-ndjson. Read only; never stored by a cache. It reads as the operator's own glab login, so only a request
// addressed to this machine is answered (local.ts): anything else gets one refused line. connection() first: the
// environment and the runtime settings are the running server's, never the build's.
import { connection } from 'next/server';
import { notLocal } from '@/server/actions/local';
import { lineOf, probeDeps, probeStream } from '@/app/features/start/data/probe';

const HEADERS = { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' };

export async function GET(req: Request): Promise<Response> {
  await connection();
  const away = notLocal(req.headers);
  if (away) return new Response(lineOf({ t: 'refused', reason: `${away}: the setup checks run only on your own machine` }), { status: 403, headers: HEADERS });
  return new Response(probeStream(probeDeps()), { headers: HEADERS });
}
