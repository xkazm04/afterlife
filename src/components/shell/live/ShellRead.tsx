// The shell's request-time read: the root layout renders it inside <Suspense>, so the static shell (prerendered at build)
// carries PENDING_SHELL and this streams in per request. connection() comes first: nothing below it runs at build time, so
// the mode (AFTERLIFE_MODE) and the numbers are always the running server's, never the build's.
import { connection } from 'next/server';
import { getDataSource, readDataConfig } from '@/server/data';
import { readShellInfo } from '@/server/data/shell/read';
import type { ShellInfo } from '../ShellContext';
import { readEstate } from './estateRead';
import { ShellAdopt } from './ShellAdopt';

/**
 * Live before the first poll the read throws its reason. The shell does not: it says live with nothing read yet (no badge,
 * never a zero), and the (app) layout's gate shows Trace, the setup wire, where a screen would have failed.
 */
export async function ShellRead() {
  await connection();
  const estate = await readEstate();
  const info = readOrNotReady();
  return <ShellAdopt info={estate ? { ...info, estate } : info} />;
}

function readOrNotReady(): ShellInfo {
  try {
    return readShellInfo(getDataSource());
  } catch (e) {
    const cfg = readDataConfig();
    if (cfg.mode !== 'live') throw e;
    return { needsYouCount: null, data: { mode: 'live', fakeGitlab: cfg.gitlab === 'fake', group: 'first poll not finished', illustrative: false, poll: null } };
  }
}
