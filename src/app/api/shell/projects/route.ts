// GET /api/shell/projects: every project as the command palette lists it (readShellProjects). The palette asks on its
// first open and again on regained focus at most once a minute, so the list is never in the shell's RSC payload.
import { getDataSource } from '@/server/data';
import { readShellProjects } from '@/server/data/shell/read';
import { answerShell } from '../answer';

/** Live before the first poll: a 503 with the reason, never the demo's projects; any other failure a fixed body. */
export async function GET(): Promise<Response> {
  return answerShell('/api/shell/projects', () => ({ projects: readShellProjects(getDataSource()) }));
}
