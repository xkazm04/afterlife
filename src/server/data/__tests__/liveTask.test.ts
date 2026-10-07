// A task the poller derives that the Task screen has no fixture for (its id is not in TASK_ORDER): Fleet lists it for its
// project and the docket draws it, so /task/<id> has data. Proved against the fake GitLab (ledgerline !45), never GitLab.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { loadFleetData } from '@/app/features/fleet/data/loadFleetData';
import { TASK_ORDER } from '@/app/features/task/data/details';
import { firstTaskId, loadTasks } from '@/app/features/task/model/build/loadTasks';
import { createDemoGitLab, EXTRA_TASK } from '@/server/gitlab/fake/demo';
import { memoryIndex } from '@/server/index/__tests__/memoryIndex';
import { seedDemo, SEED_NOW } from '@/server/index/seed';
import { readPollerConfig } from '@/server/poller/config';
import { runPollCycle } from '@/server/poller/cycle';
import { demoSource } from '../demoSource';
import { replayClock } from '../live/clock';
import { liveSource } from '../live/liveSource';
import { buildSnapshot } from '../live/snapshot';
import { setDataSource } from '../select';
import type { DataSource } from '../types';

let live: DataSource;
beforeAll(async () => {
  const db = await memoryIndex();
  await seedDemo(db);
  const gl = createDemoGitLab(SEED_NOW, { extraTask: true });
  const cycle = await runPollCycle(gl.port, db, replayClock.poll(), { cfg: readPollerConfig(144060371, {}) });
  expect(cycle.projects.every((p) => p.ok)).toBe(true);
  const snap = await buildSnapshot(db, replayClock.read(), 'ledgerline', DEMO);
  live = liveSource(() => snap);
  setDataSource(live);
}, 60_000);
afterAll(() => setDataSource(null));

const asProps = (v: unknown): unknown => JSON.parse(JSON.stringify(v)) as unknown;

describe('a poller-derived task with no Task fixture', () => {
  it('is in the data source, and is no fixture', () => {
    expect(TASK_ORDER).not.toContain(EXTRA_TASK.id);
    expect(live.getTasks().map((t) => t.id)).toContain(EXTRA_TASK.id);
  });

  it('the Fleet inspector lists it for ledgerline, with its stored verdict', () => {
    const data = loadFleetData();
    expect(data.deep.id).toBe('ledgerline');
    expect(data.deep.tasks.find((t) => t.id === EXTRA_TASK.id)).toEqual({
      id: '01J8QD', title: 'Bump jackson-databind 2.17.1 → 2.17.2', mr: '!45', track: 'T1', state: 'proved · awaiting merge', verdict: 'PASS',
    });
  });

  it('buildTasks draws the source’s tasks and no demo-only fixture, 01J8QD from its own fields, so /task/01J8QD has data', () => {
    const tasks = loadTasks();
    expect(tasks.map((t) => t.id)).toEqual(['01J8Q4', '01J8Q9', '01J8QB', '01J8QC', '01J8QD']);
    for (const id of ['01J8Q7', '01J8Q8', '01J8QA']) expect(tasks.map((t) => t.id)).not.toContain(id);
    const t = tasks.find((x) => x.id === EXTRA_TASK.id);
    expect(t).toMatchObject({
      fixture: false, mr: '!45', cls: 'dep-bump.patch', track: 'T1', tierAtTime: 'hands_off', state: 'proved · awaiting merge',
      agentWords: 'Patch release; ledgerline uses no API it changes.', agent: 'agent unknown', flowRun: 'flow run unknown',
      chain: [], envelope: null, hunk: null, ledger: [], trace: [], seeded: false,
    });
    expect(t?.proof).toMatchObject({ cls: 'bench-delta', verdict: 'PASS', engine: 'proof-engine v1' });
    // The block's own ties: each check answers the claim it tests, the envelope check none. No chain: no link to light.
    expect(t?.claims.map((c) => [c.id, c.checks])).toEqual([['c1', ['lockfile-patch']], ['c2', ['head-green']]]);
    expect(t?.proof.checks.map((c) => [c.id, c.claims, c.link, c.ok])).toEqual([
      ['lockfile-patch', ['c1'], -1, true], ['head-green', ['c2'], -1, true], ['inside-envelope', [], -1, true],
    ]);
  });

  it('firstTaskId() is the first task the docket draws, and each drawn task with a fixture equals its demo rendering', () => {
    const drawn = asProps(loadTasks()) as { id: string }[];
    expect(firstTaskId()).toBe(drawn[0]?.id);
    expect(firstTaskId()).toBe(live.getTasks()[0]?.id);
    setDataSource(demoSource);
    const demo = asProps(loadTasks()) as { id: string }[];
    setDataSource(live);
    const withFixture = drawn.filter((t) => (TASK_ORDER as readonly string[]).includes(t.id));
    expect(withFixture.length).toBeGreaterThan(0);
    for (const t of withFixture) expect(t).toEqual(demo.find((x) => x.id === t.id));
  });
});
