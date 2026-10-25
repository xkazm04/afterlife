// GET /api/screen/<key>: one sample screen's props (fleet, monitor, needs-you) as its page passes them, for the tab-switch
// bake-off's client hosts (arms B and C). Read per request, never cached; the query passes through (fleet's list state).
import { connection } from 'next/server';
import { isScreenKey, loadScreenProps } from '@/app/features/shell-arms/data/screenProps';
import { toWire } from '@/app/features/shell-arms/model/wire';
import { messageOf } from '@/lib/format/error';
import { NotReadyError } from '@/server/data';

const NO_STORE = { 'cache-control': 'no-store' };

/**
 * `{ key, asOf, props }`, props as model/wire.ts sends them (fleet's start-state Sets as arrays). An unknown key is a
 * 404. Live before the first poll a 503 with the reason (never the demo's numbers); any other throw a 503 with a fixed
 * body, the message (which may name a path) only in the server log.
 */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }): Promise<Response> {
  await connection();
  const { key } = await params;
  if (!isScreenKey(key)) return Response.json({ error: 'unknown screen' }, { status: 404, headers: NO_STORE });
  try {
    const props = toWire(key, await loadScreenProps(key, new URL(req.url).searchParams));
    return Response.json({ key, asOf: new Date().toISOString(), props }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof NotReadyError) return Response.json({ error: e.message }, { status: 503, headers: NO_STORE });
    console.error(`belay: /api/screen/${key} could not read the screen: ${messageOf(e)}`);
    return Response.json({ error: 'screen unreadable' }, { status: 503, headers: NO_STORE });
  }
}
