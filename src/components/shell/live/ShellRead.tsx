// The shell's request-time read: the root layout renders it inside <Suspense>, so the static shell (prerendered at build)
// carries PENDING_SHELL and this streams in per request. connection() comes first: nothing below it runs at build time, so
// the mode (BELAY_MODE) and the numbers are always the running server's, never the build's.
import { connection } from 'next/server';
import { getDataSource } from '@/server/data';
import { readShellInfo } from '@/server/data/shell/read';
import { ShellAdopt } from './ShellAdopt';

/** Live before the first poll the read throws its reason, as it did in the layout: global-error.tsx names it. */
export async function ShellRead() {
  await connection();
  return <ShellAdopt info={readShellInfo(getDataSource())} />;
}
