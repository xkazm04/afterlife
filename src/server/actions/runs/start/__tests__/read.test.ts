// The panel's server reads on a temp Afterlife checkout: the fleet as the runner loads it, a repo's branches, and the
// hosted replay, which reads nothing.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { listRunBranches, loadStartData, REPLAY_CLOSED, runRepos } from '../read';
import { gitRig } from './rig';

const rig = gitRig();
const afterlife = path.join(rig.dir, 'afterlife');
fs.mkdirSync(path.join(afterlife, '.belay', 'projects'), { recursive: true });
fs.writeFileSync(path.join(afterlife, '.belay', 'fleet.yml'), `repos:\n  - slug: grinex-portal\n    path: ${JSON.stringify(rig.repo)}\n    base: main\n    laneCapUsd: 2\n    gates: ["npm test"]\n`);
afterAll(() => rig.cleanup());
afterEach(() => vi.unstubAllEnvs());

describe('runRepos', () => {
  it("reads the fleet the spawned CLI reads, with the repo's own caps", () => {
    vi.stubEnv('BELAY_DATA_DIR', path.join(afterlife, '.belay'));
    expect(runRepos(afterlife)).toEqual({ ok: true, repos: [{ slug: 'grinex-portal', path: rig.repo, base: 'main', laneCapUsd: 2 }] });
  });
  it('says why with no fleet file', () => {
    vi.stubEnv('BELAY_DATA_DIR', path.join(rig.dir, 'empty'));
    expect(runRepos(path.join(rig.dir, 'nowhere'))).toMatchObject({ ok: false, reason: expect.stringMatching(/no fleet file at/) });
  });
});

describe('listRunBranches and loadStartData', () => {
  it("lists a fleet repo's branches and refuses another slug", async () => {
    vi.stubEnv('BELAY_DATA_DIR', path.join(afterlife, '.belay'));
    expect(await listRunBranches('grinex-portal', afterlife)).toMatchObject({ ok: true, head: 'main', branches: [{ name: 'feature/free' }, { name: 'feature/held' }, { name: 'main' }] });
    expect(await listRunBranches('other', afterlife)).toEqual({ ok: false, reason: 'other is not a fleet repo' });
  }, 30_000);
  it('draws the panel from every repo and its branches', async () => {
    vi.stubEnv('BELAY_DATA_DIR', path.join(afterlife, '.belay'));
    const d = await loadStartData({}, afterlife, 1);
    expect(d.repos.map((r) => r.slug)).toEqual(['grinex-portal']);
    expect(d.branches['grinex-portal']).toMatchObject({ ok: true, head: 'main' });
  }, 30_000);
  it('the hosted replay is closed and reads nothing', async () => {
    expect(await loadStartData({ BELAY_MODE: 'replay' }, afterlife, 2)).toEqual({ repos: [], branches: {}, closed: REPLAY_CLOSED });
  });
});
