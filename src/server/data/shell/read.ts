// The shell's one read: the Needs-you badge and what the status bar says about the data and the poll. The root layout
// renders it and GET /api/shell answers it, so the chrome's first paint and every re-read on focus come from the same
// function. The palette's projects are read apart (readShellProjects, GET /api/shell/projects): every project in every
// RSC payload was the shell's weight, and only an open palette needs them.
import type { KnownShellInfo, ShellProject } from '@/components/shell/ShellContext';
import { pollIntervalMs } from '@/server/poller/scheduler';
import { readDataConfig } from '../config';
import type { DataSource } from '../types';

/** Reads the source now. Live before the first poll it throws the source's reason: there is no demo fallback. */
export function readShellInfo(ds: DataSource, env: Record<string, string | undefined> = process.env): KnownShellInfo {
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

/** Every project, as small as the command palette needs. Live before the first poll it throws, as readShellInfo does. */
export function readShellProjects(ds: DataSource): ShellProject[] {
  return ds.getFleet().projects.map((p) => ({ id: p.id, name: p.name, group: p.group, state: p.state }));
}
