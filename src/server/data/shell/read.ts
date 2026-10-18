// The shell's one read: the Needs-you badge and what the status bar says about the data and the poll. The root layout
// renders it and GET /api/shell answers it, so the chrome's first paint and every re-read on navigation come from the
// same function.
import type { ShellInfo } from '@/components/shell/ShellContext';
import { pollIntervalMs } from '@/server/poller/scheduler';
import { readDataConfig } from '../config';
import type { DataSource } from '../types';

/** Reads the source now. Live before the first poll it throws the source's reason: there is no demo fallback. */
export function readShellInfo(ds: DataSource, env: Record<string, string | undefined> = process.env): ShellInfo {
  const health = ds.getPollHealth();
  return {
    needsYouCount: ds.getNeedsYouCount(),
    data: {
      mode: ds.mode,
      fakeGitlab: ds.mode === 'live' && readDataConfig(env).gitlab === 'fake',
      group: ds.getPortfolio().group,
      illustrative: ds.illustrative.length > 0,
      poll: health && { ...health, intervalSec: pollIntervalMs(env) / 1000 },
    },
  };
}
