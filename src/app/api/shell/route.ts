// GET /api/shell: the shell's read (readShellInfo, the same the root layout renders) for the client to re-read on
// regained focus (a layout does not re-render on navigation; refresh() re-renders it). Read only; never stored by a cache.
import { getDataSource } from '@/server/data';
import { readShellInfo } from '@/server/data/shell/read';
import { readEstate } from '@/components/shell/live/estateRead';
import { answerShell } from './answer';

/** Live before the first poll: a 503 with the reason; any other failure a 503 with a fixed body (answer.ts). */
export async function GET(): Promise<Response> {
  const estate = await readEstate();
  return answerShell('/api/shell', () => {
    const info = readShellInfo(getDataSource());
    return estate ? { ...info, estate } : info;
  });
}
