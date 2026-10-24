// GET /api/runs: readRuns()'s data (RunsData) plus the live meta, as JSON. Read per request, never cached: Theater's live
// film polls it every 2 s.
import { connection } from 'next/server';
import { loadLivePayload } from '@/app/features/theater/live/server/livePayload';
import { messageOf } from '@/lib/format/error';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * A read that throws is a 503 with a fixed body, as /api/shell answers: never the fs message, which names a path, since
 * the route is public in the hosted replay. The reason goes to the server log instead. connection() first: the runs are
 * read at request time, never prerendered by the build.
 */
export async function GET(): Promise<Response> {
  await connection();
  try {
    return Response.json(loadLivePayload(), { headers: NO_STORE });
  } catch (e) {
    console.error(`belay: /api/runs could not read the runs: ${messageOf(e)}`);
    return Response.json({ error: 'runs unreadable' }, { status: 503, headers: NO_STORE });
  }
}
