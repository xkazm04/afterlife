// Which GitLab the live data source talks to: the operator's own glab login, or the seeded fake group.
import { createGlabAdapter, defaultExec, readConfig } from '@/server/gitlab';
import { resolveGlabBin } from '@/server/gitlab/config';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import type { GitLabPort } from '@/server/gitlab/port';
import { SEED_NOW } from '@/server/index/seed/parse';
import type { GitLabKind } from '../config';
import { replayClock, systemClock, type Clock } from './clock';

export interface LivePort {
  port: GitLabPort;
  clock: Clock;
  /** Fake: a throwaway in-memory index seeded with the demo. Real: the persistent index under BELAY_DATA_DIR. */
  seeded: boolean;
}

export async function createLivePort(kind: GitLabKind): Promise<LivePort> {
  if (kind === 'fake') return { port: createDemoGitLab(SEED_NOW).port, clock: replayClock, seeded: true };
  const cfg = readConfig();
  const bin = await resolveGlabBin(cfg, defaultExec);
  return { port: createGlabAdapter({ bin, host: cfg.host, exec: defaultExec }), clock: systemClock, seeded: false };
}
