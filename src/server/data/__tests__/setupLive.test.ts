// Setup in live mode reads its states from the fake GitLab (the demo group) and the index, never from the catalogue:
// each track's arm block (checkArm), the belay doctor (probeCapabilities) and the steps a read can observe.
import { describe, expect, it } from 'vitest';
import { DEMO } from '@/lib/demo';
import { liveRig } from '@/server/actions/__tests__/rig';
import { removeBlock } from '@/server/actions/arm/block';
import { armOf } from '@/server/actions/arm/content';
import { probeCapabilities } from '@/server/gitlab/capabilities';
import { GitLabError } from '@/server/gitlab/errors';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { LEDGERLINE_CI } from '@/server/gitlab/fake/demo/ciFile';
import type { FakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import type { GitLabPort } from '@/server/gitlab/port';
import { getPairing } from '@/server/index/repositories/pairing';
import { BELAY_PROJECTS, readLiveSetup, setupReads, type SetupPort } from '../setup/read';

const IDS = DEMO.setup.arm.map(([id]) => id);
const AT = new Date('2026-10-07T09:30:00Z');
const ledgerline = (gl: FakeGitLab) => gl.state.projects.find((p) => p.raw.name === 'ledgerline')!;
const UNARMED = (() => {
  const r = removeBlock(LEDGERLINE_CI, armOf('T4')!);
  if (!r.ok) throw new Error('the demo file has no T4 block');
  return r.content;
})();

async function reads(o: { wrap?: (p: GitLabPort) => GitLabPort; project?: string; armed?: boolean } = {}) {
  const r = await liveRig(o.wrap);
  if (o.armed === false) ledgerline(r.gl).files['.gitlab-ci.yml'] = UNARMED;
  const port: SetupPort = { port: r.deps.port, groupId: r.deps.groupId, gitlabId: r.deps.gitlabId };
  return { ...r, reads: setupReads(port, await getPairing(r.db, 'default'), o.project ?? 'ledgerline', () => AT) };
}

/** The port, except that reading one file fails as GitLab would. */
const fileFails = (p: GitLabPort): GitLabPort => new Proxy(p, { get: (t, k, r) => (k === 'getFile' ? () => Promise.reject(new GitLabError('forbidden', '403 Forbidden', 'files', 403)) : Reflect.get(t, k, r)) });

describe("a track's live state is the read of the target's main (checkArm), never setup.arm", () => {
  it('armed: T4 is armed on ledgerline in the demo group; every other track is not defined yet', async () => {
    const { reads: r } = await reads();
    const { tracks, at } = await r.tracks(IDS);
    expect(tracks.T4).toEqual({ state: 'armed', text: expect.stringMatching(/T4's arm block is in \.gitlab-ci\.yml on main of .*ledgerline \(line \d+\)/) });
    for (const id of IDS.filter((x) => x !== 'T4')) expect(tracks[id]).toEqual({ state: 'undefined', text: expect.stringMatching(new RegExp(`does not define ${id}'s arm content`)) });
    expect(at.at).toBe(AT.toISOString());
  });

  it('absent: with no T4 block on main, T4 can be armed', async () => {
    const { reads: r } = await reads({ armed: false });
    expect((await r.tracks(['T4'])).tracks.T4).toEqual({ state: 'absent', text: expect.stringMatching(/has no T4 arm block/) });
  });

  it('refused or failed: unknown, with the reason', async () => {
    const away = await reads({ project: 'not-in-the-group' });
    expect((await away.reads.tracks(['T4'])).tracks.T4).toEqual({ state: 'unknown', reason: 'not-in-the-group is not a project Belay has read from GitLab yet' });
    const failing = await reads({ wrap: fileFails });
    expect((await failing.reads.tracks(['T4'])).tracks.T4).toEqual({ state: 'unknown', reason: expect.stringMatching(/GitLab said no while reading: 403 Forbidden/) });
  });

  it('with no port yet, a defined track is unknown and says why; nothing is read as armed', async () => {
    const r = setupReads(null, null, 'ledgerline', () => AT);
    const { tracks } = await r.tracks(['T4', 'T3']);
    expect(tracks.T4).toEqual({ state: 'unknown', reason: expect.stringMatching(/no GitLab port/) });
    expect(tracks.T3?.state).toBe('undefined');
  });
});

describe("the doctor's live rows are probeCapabilities' against the paired group", () => {
  it('each row keeps its status and reason, stamped with the probe time; no demo row, no acme-sandbox', async () => {
    const { reads: r, deps } = await reads();
    const d = await r.doctor();
    const want = await probeCapabilities(deps.port, deps.groupId);
    expect(d.rows).toEqual(want.capabilities.map((c) => ({ id: c.id, label: c.label, status: c.status, reason: c.reason })));
    expect(d).toMatchObject({ at: AT.toISOString(), error: null });
    const demoNames = new Set(DEMO.setup.doctor.rows.map(([n]) => n));
    expect(d.rows.filter((x) => demoNames.has(x.label))).toEqual([]);
    expect(JSON.stringify(d)).not.toContain('acme-sandbox');
  });

  it('available, unavailable and unknown each keep their reason (the demo group on the Free plan)', async () => {
    const free = createDemoGitLab(undefined, { plan: 'free' });
    const d = await setupReads({ port: free.port, groupId: 144060371, gitlabId: () => Promise.resolve(null) }, null, 'ledgerline', () => AT).doctor();
    const by = (st: string) => d.rows.filter((x) => x.status === st);
    for (const st of ['available', 'unavailable', 'unknown']) expect(by(st).length, st).toBeGreaterThan(0);
    expect(by('unavailable').map((x) => x.reason)).toContain('security report views needs ultimate; this namespace is on free. Start the trial or upgrade');
    expect(by('unknown').find((x) => x.id === 'custom_flows')?.reason).toMatch(/no REST read endpoint/);
    for (const x of d.rows) expect(x.reason.length).toBeGreaterThan(0);
  });
});

describe('the live steps show what a read saw, and unknown for every other', () => {
  it('0: the login; 1: the pairing row; 4: the target and the four belay projects; every other step: not probed', async () => {
    const { reads: r } = await reads();
    const { steps } = await r.steps();
    expect(steps[0]).toEqual({ state: 'done', text: expect.stringMatching(/^glab api user → 200 · signed in as @/) });
    expect(steps[1]).toEqual({ state: 'failed', text: 'acme-lab on gitlab.com is paired, but no checkout is recorded' });
    expect(steps[4]).toEqual({ state: 'failed', text: '3 of 5 projects exist · missing belay-pack, belay-engine' });
    for (let n = 0; n <= 14; n++) if (![0, 1, 4].includes(n)) expect(steps[n]).toEqual({ state: 'unknown', reason: 'not probed' });
    expect(Object.values(steps).map((s) => s.state).filter((s) => !['done', 'failed', 'unknown'].includes(s))).toEqual([]);
  });

  it('step 4 is done once every project is there', async () => {
    const { gl, reads: r } = await reads();
    const base = gl.state.projects.find((p) => p.raw.name === 'belay-policy')!;
    for (const [i, name] of ['belay-pack', 'belay-engine'].entries()) {
      gl.state.projects.push({ ...base, raw: { ...base.raw, id: 777 + i, name, path: name, path_with_namespace: `acme-lab/${name}` }, files: {} });
    }
    expect((await r.steps()).steps[4]).toEqual({ state: 'done', text: '5 of 5 projects exist' });
    expect(r.projects).toEqual(['ledgerline', ...BELAY_PROJECTS]);
  });

  it('readLiveSetup: the paired group, its host and the target, with every part read', async () => {
    const { reads: r } = await reads();
    const l = await readLiveSetup(r, IDS);
    expect([l.group, l.host, l.project]).toEqual(['acme-lab', 'gitlab.com', 'ledgerline']);
    expect(Object.keys(l.tracks)).toEqual(IDS);
    expect(l.doctor.rows.length).toBeGreaterThan(0);
  });
});
