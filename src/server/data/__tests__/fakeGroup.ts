// The fake-group rig: the seeded index polled once from the demo GitLab, served by the live source, beside the demo
// source. parity.test.ts compares every loader across the two; the ledger tests read the ledger it imported.
import type { PGlite } from '@electric-sql/pglite';
import { expect } from 'vitest';
import { DEMO } from '@/lib/demo';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { replayClock } from '../live/clock';
import { liveSource } from '../live/liveSource';
import { buildSnapshot } from '../live/snapshot';
import { rulesOf } from '../policy';
import type { DataSource } from '../types';

export async function fakeGroupLive(): Promise<{ db: PGlite; live: DataSource }> {
  const db = await memoryIndex();
  await seedDemo(db);
  const gl = createDemoGitLab(SEED_NOW);
  const cycle = await runPollCycle(gl.port, db, replayClock.poll(), { cfg: readPollerConfig(144060371, {}) });
  expect(cycle.projects.every((p) => p.ok)).toBe(true);
  const snap = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO, cycle.policy ? rulesOf(cycle.policy) : null);
  // Setup's live reads go through the demo GitLab, as the runtime's port would (select.ts).
  const live = liveSource(() => snap, DEMO, () => ({ port: gl.port, groupId: 144060371, gitlabId: async (id) => (await getProjectRow(db, id))?.gitlabId ?? null }));
  return { db, live };
}
