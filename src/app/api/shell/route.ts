// GET /api/shell: the shell's read (readShellInfo, the same the root layout renders) for the client to re-read on
// navigation and focus, since a layout does not re-render on navigation. Read only; never stored by a cache.
import { connection } from 'next/server';
import { getDataSource } from '@/server/data';
import { readShellInfo } from '@/server/data/shell/read';

const NO_STORE = { 'cache-control': 'no-store' };

/**
 * Live before the first poll the source throws its reason: a 503 with it, never the demo's numbers in live mode.
 * connection() first: the data source is chosen per request (BELAY_MODE), so the build never prerenders this answer.
 */
export async function GET(): Promise<Response> {
  await connection();
  try {
    return Response.json(readShellInfo(getDataSource()), { headers: NO_STORE });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503, headers: NO_STORE });
  }
}
