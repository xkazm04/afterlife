// GET /api/shell/projects: every project as the command palette lists it (readShellProjects). The palette asks on its
// first open and again on regained focus at most once a minute, so the list is never in the shell's RSC payload.
import { connection } from 'next/server';
import { getDataSource } from '@/server/data';
import { readShellProjects } from '@/server/data/shell/read';

const NO_STORE = { 'cache-control': 'no-store' };

/** Live before the first poll: a 503 with the reason, never the demo's projects. connection() first: request time only. */
export async function GET(): Promise<Response> {
  await connection();
  try {
    return Response.json({ projects: readShellProjects(getDataSource()) }, { headers: NO_STORE });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503, headers: NO_STORE });
  }
}
