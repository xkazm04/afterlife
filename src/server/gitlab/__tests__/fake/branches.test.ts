// The fake keeps a tree per branch: a write to belay/* leaves main as it was until a person merges the MR.
import { describe, expect, it } from 'vitest';
import { createFakeGitLab, type FakeGitLab } from '../../fake/fakeGitLab';
import { mergeMr } from '../../fake/merge';

const LEDGERLINE = 90010001;
const CI = '.gitlab-ci.yml';
const BRANCH = 'belay/x';

async function branchWrite(o: { removeSourceBranch?: boolean } = {}) {
  const gl = createFakeGitLab();
  const { port } = gl;
  const old = (await port.getFile(LEDGERLINE, CI, 'main'))!;
  await port.execute(port.plan.commitFile({ project: LEDGERLINE, path: CI, branch: BRANCH, startBranch: 'main', action: 'update', lastCommitId: old.lastCommitId ?? undefined, content: 'NEW', message: 'arm' }));
  const mr = async () => {
    await port.execute(port.plan.createMr({ project: LEDGERLINE, sourceBranch: BRANCH, targetBranch: 'main', title: 'Arm', removeSourceBranch: o.removeSourceBranch }));
    return (await port.listMergeRequests(LEDGERLINE, { state: 'opened' })).find((m) => m.sourceBranch === BRANCH)!.iid;
  };
  return { gl, port, old, mr };
}
const head = async (gl: FakeGitLab) => (await gl.port.get(`projects/${LEDGERLINE}/repository/branches/${encodeURIComponent(BRANCH)}`)) as { commit: { id: string } };
const stateOf = async (gl: FakeGitLab, iid: number) => (await gl.port.listMergeRequests(LEDGERLINE)).find((m) => m.iid === iid)!;

describe('fake GitLab: a branch is its own tree', () => {
  it('a commit to a new branch leaves main as it was; the branch reads the new content at its head', async () => {
    const { gl, port, old } = await branchWrite();
    expect(await port.getFile(LEDGERLINE, CI, 'main')).toMatchObject({ content: old.content, lastCommitId: old.lastCommitId });
    const onBranch = await port.getFile(LEDGERLINE, CI, BRANCH);
    expect(onBranch?.content).toBe('NEW');
    expect(onBranch?.lastCommitId).toBe((await head(gl)).commit.id);
  });

  it('a file created on a branch is in that branch tree only', async () => {
    const { port } = createFakeGitLab();
    await port.execute(port.plan.commitFile({ project: LEDGERLINE, path: 'docs/new.md', branch: BRANCH, startBranch: 'main', action: 'create', content: 'doc', message: 'add' }));
    expect((await port.listTree(LEDGERLINE, { ref: BRANCH, recursive: true })).map((t) => t.path)).toContain('docs/new.md');
    expect((await port.listTree(LEDGERLINE, { ref: 'main', recursive: true })).map((t) => t.path)).not.toContain('docs/new.md');
  });

  it("the branch's commit is in the branch's commit list, not main's", async () => {
    const { gl, port } = await branchWrite();
    const id = (await head(gl)).commit.id;
    expect((await port.listCommits(LEDGERLINE, { ref: 'main', path: CI })).map((c) => c.id)).not.toContain(id);
    expect((await port.listCommits(LEDGERLINE, { ref: BRANCH, path: CI }))[0]?.id).toBe(id);
  });

  it("an update straight to main naming main's unchanged last commit is not refused by the branch's commit", async () => {
    const { port, old } = await branchWrite();
    await port.execute(port.plan.commitFile({ project: LEDGERLINE, path: CI, branch: 'main', action: 'update', lastCommitId: old.lastCommitId ?? undefined, content: 'MAIN', message: 'm' }));
    expect((await port.getFile(LEDGERLINE, CI, 'main'))?.content).toBe('MAIN');
  });
});

describe('fake GitLab: the merge route is the only way a branch reaches main', () => {
  it('merging the MR marks it merged and brings the branch content onto main', async () => {
    const { gl, port, mr } = await branchWrite();
    const iid = await mr();
    expect(await mergeMr(gl, LEDGERLINE, iid)).toMatchObject({ status: 200 });
    expect(await stateOf(gl, iid)).toMatchObject({ state: 'merged', mergedAt: expect.any(String) });
    expect((await port.getFile(LEDGERLINE, CI, 'main'))?.content).toBe('NEW');
  });

  it('an MR created with removeSourceBranch deletes the branch when it merges', async () => {
    const { gl, port, mr } = await branchWrite({ removeSourceBranch: true });
    await mergeMr(gl, LEDGERLINE, await mr());
    await expect(head(gl)).rejects.toMatchObject({ status: 404 });
    expect(await port.getFile(LEDGERLINE, CI, BRANCH)).toBeNull();
  });

  it("refuses (406) when main's copy changed after the branch started; the MR stays open and main is untouched", async () => {
    const { gl, port, mr } = await branchWrite();
    gl.state.projects.find((p) => p.raw.id === LEDGERLINE)!.files[CI] = 'SOMEONE ELSE';
    const iid = await mr();
    expect(await mergeMr(gl, LEDGERLINE, iid)).toMatchObject({ status: 406, body: { message: '406 Branch cannot be merged' } });
    expect((await stateOf(gl, iid)).state).toBe('opened');
    expect((await port.getFile(LEDGERLINE, CI, 'main'))?.content).toBe('SOMEONE ELSE');
  });
});
