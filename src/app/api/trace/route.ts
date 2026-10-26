// GET /api/trace: Trace's Re-check, the app's own probes run again (data/probe.ts). Read only; never stored by a cache.
// `?rehearse=not-ready` judges the live node as the rehearsal shows it. connection() first: the environment is the
// running server's, never the build's.
import { connection } from 'next/server';
import { runTraceProbe } from '@/app/features/start/gate/traceProbe';

export async function GET(req: Request): Promise<Response> {
  await connection();
  const rehearse = new URL(req.url).searchParams.get('rehearse') === 'not-ready';
  return Response.json(await runTraceProbe(rehearse, req.headers), { headers: { 'cache-control': 'no-store' } });
}
