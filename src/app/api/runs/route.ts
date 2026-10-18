// GET /api/runs: readRuns()'s data (RunsData) plus the live meta, as JSON. Read per request, never cached: Theater's live
// film polls it every 2 s.
import { loadLivePayload } from '@/app/features/theater/live/server/livePayload';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(loadLivePayload(), { headers: { 'Cache-Control': 'no-store' } });
}
