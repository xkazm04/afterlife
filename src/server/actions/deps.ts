// The dependencies of an action for the running server: demo mode plans against the seeded fake group and never
// executes; live mode uses the live runtime's port (the operator's glab login), index and poller. Demo reads no
// environment: the fake group's shape is fixed, and the hosted replay must not name the server's settings (F93).
import { serverEnv } from '@/server/env/env';
import { readConfig } from '@/server/gitlab/config';
import { createDemoGitLab, GROUP_ID } from '@/server/gitlab/fake/demo';
import { readDataConfig } from '@/server/data/config';
import { lastStartFailure, readyRuntime } from '@/server/data/live/runtime';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { SEED_NOW } from '@/server/index/seed/parse';
import { readPollerConfig } from '@/server/poller/config';
import { DEMO_PIN, readArmConfig } from './arm/config';
import type { ActionDeps } from './run';

let planner: ReturnType<typeof createDemoGitLab> | null = null;

export function actionDeps(env: Record<string, string | undefined> = serverEnv()): ActionDeps | null {
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
  return {
    mode: 'demo', port: planner.port, db: null, groupId: GROUP_ID, cfg: readPollerConfig(GROUP_ID, {}), now: () => SEED_NOW,
    refresh: () => Promise.resolve(), gitlabId: () => Promise.resolve(null), arm: { ok: true, pin: DEMO_PIN },
  };
}

/** Why live mode has no deps yet, as the pages tell the two apart (select.ts): a first poll still running, or a failed start. */
export function notReadyReason(): string {
  const failed = lastStartFailure();
  return failed ? `the live start failed: ${failed.message}` : 'live mode has not finished its first poll; try again in a moment';
}
