// The shell routes' one answer shape: the read as JSON, never stored by a cache, or a 503.
import { connection } from 'next/server';
import { NotReadyError } from '@/server/data';
import { messageOf } from '@/lib/format/error';

const NO_STORE = { 'cache-control': 'no-store' };

/**
 * Live before the first poll the source throws its reason (NotReadyError): a 503 with it, never the demo's numbers in live
 * mode. Any other throw is a 503 with a fixed body, as /api/runs answers: its message may name a path, and the reason
 * goes to the server log. connection() first: the data source is chosen per request (AFTERLIFE_MODE), so the build never
 * prerenders this answer.
 */
export async function answerShell(route: string, read: () => unknown): Promise<Response> {
  await connection();
  try {
    return Response.json(read(), { headers: NO_STORE });
  } catch (e) {
    if (e instanceof NotReadyError) return Response.json({ error: e.message }, { status: 503, headers: NO_STORE });
    console.error(`afterlife: ${route} could not read the shell: ${messageOf(e)}`);
    return Response.json({ error: 'shell unreadable' }, { status: 503, headers: NO_STORE });
  }
}
