// GET /api/shell: the shell's read (readShellInfo, the same the root layout renders) for the client to re-read on
// regained focus (a layout does not re-render on navigation; refresh() re-renders it). Read only; never stored by a cache.
import { getDataSource } from '@/server/data';
import { readShellInfo } from '@/server/data/shell/read';
import { answerShell } from './answer';

/** Live before the first poll: a 503 with the reason; any other failure a 503 with a fixed body (answer.ts). */
export async function GET(): Promise<Response> {
  return answerShell('/api/shell', () => readShellInfo(getDataSource()));
}
