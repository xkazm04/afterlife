// The dependencies of an action for the running server: demo mode plans against the seeded fake group and never
// executes; live mode uses the live runtime's port (the operator's glab login), index and poller.
import { readConfig } from '@/server/gitlab/config';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { readDataConfig } from '@/server/data/config';
import { readyRuntime } from '@/server/data/live/runtime';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { SEED_NOW } from '@/server/index/seed/parse';
import { readPollerConfig } from '@/server/poller/config';
import { DEMO_PIN, readArmConfig } from './arm/config';
import type { ActionDeps } from './run';

let planner: ReturnType<typeof createDemoGitLab> | null = null;

export function actionDeps(env: Record<string, string | undefined> = process.env): ActionDeps | null {
  const data = readDataConfig(env);
  if (data.mode === 'live') {
    const rt = readyRuntime();
    if (!rt) return null;
    const groupId = readConfig(env).groupId;
    return {
      mode: 'live', port: rt.port, db: rt.db, groupId, cfg: readPollerConfig(groupId, env), now: rt.clock.read, refresh: rt.refresh,
      gitlabId: async (id) => (await getProjectRow(rt.db, id))?.gitlabId ?? null, arm: readArmConfig(env),
    };
  }
  planner ??= createDemoGitLab(SEED_NOW);
  const groupId = readConfig(env).groupId;
  return {
    mode: 'demo', port: planner.port, db: null, groupId, cfg: readPollerConfig(groupId, env), now: () => SEED_NOW,
    refresh: () => Promise.resolve(), gitlabId: () => Promise.resolve(null), arm: { ok: true, pin: DEMO_PIN },
  };
}
