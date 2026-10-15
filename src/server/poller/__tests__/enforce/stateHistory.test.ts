// tier-state.yml's history, on the demo GitLab: the commit list (newest first) and, for each record, the commit that
// wrote it. A record unchanged through every commit read, a revision that cannot be read, or a commit that landed between
// the two reads leaves the writer unknown (null): never guessed. Each revision is read once (PollMemory.states).
import { parse, stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { TierState } from '@/schemas/tier';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { POLICY_GID } from '@/server/gitlab/fake/demo/ids';
import { FAKE_SEED_AT } from '@/server/gitlab/fake/dataset';
import type { GitLabPort } from '@/server/gitlab/port';
import { SEED_NOW } from '@/server/index/seed';
import { createMemory } from '../../state';
import { readStateHistory } from '../../stateHistory';

const AGENT = 'ai-patcher-acme-lab';

async function setup() {
  const gl = createDemoGitLab(SEED_NOW);
  const read = async (): Promise<TierState> => parse((await gl.port.getFile(POLICY_GID, 'tier-state.yml', 'main'))!.content) as TierState;
  const commit = async (edit: (s: TierState) => void, message = 'edit'): Promise<string> => {
    const s = await read();
    edit(s);
    await gl.port.execute(gl.port.plan.commitFile({ project: POLICY_GID, path: 'tier-state.yml', branch: 'main', content: stringify(s), message, action: 'update' }));
    return (await gl.port.getFile(POLICY_GID, 'tier-state.yml', 'main'))!.lastCommitId!;
  };
  return { gl, read, commit };
}

describe('readStateHistory', () => {
  it('lists the commits newest first and names the commit that wrote each record', async () => {
    const { gl, read, commit } = await setup();
    const seed = (await gl.port.getFile(POLICY_GID, 'tier-state.yml', 'main'))!.lastCommitId!;
    const c1 = await commit((s) => void (s.agents[AGENT]!['dep-bump.patch']!.tier = 'supervised'), 'demote dep-bump.patch');
    const c2 = await commit((s) => void (s.agents[AGENT]!['code-fix.patch']!.tier = 'assisted'), 'demote code-fix.patch');
    const commits = await gl.port.listCommits(POLICY_GID, { path: 'tier-state.yml', ref: 'main' });
    expect(commits.map((c) => [c.id, c.title])).toEqual([[c2, 'demote code-fix.patch'], [c1, 'demote dep-bump.patch'], [seed, 'seed']]);
    expect(commits.at(-1)?.committedAt).toBe(FAKE_SEED_AT);
    // the file as it was at a commit
    expect((await gl.port.getFile(POLICY_GID, 'tier-state.yml', c1))?.content).toContain('dep-bump.patch');

    const mem = createMemory();
    const state = await read();
    const h = await readStateHistory(gl.port, POLICY_GID, 'main', state, mem);
    expect(h.writerOf(AGENT, 'code-fix.patch')?.id).toBe(c2);
    expect(h.writerOf(AGENT, 'dep-bump.patch')?.id).toBe(c1);
    // every other record is unchanged since the seed, and the whole history was read: the seed wrote it
    const others = Object.entries(state.agents).flatMap(([a, cls]) => Object.keys(cls).filter((k) => a !== AGENT || !['code-fix.patch', 'dep-bump.patch'].includes(k)).map((k) => h.writerOf(a, k)?.id));
    expect(others.length).toBeGreaterThan(5);
    expect(new Set(others)).toEqual(new Set([seed]));
    expect(h.writerOf('nobody', 'dep-bump.patch')).toBeNull();
    expect(mem.states.size).toBe(3);
  });

  it('past the depth read, or across an unreadable revision, the writer is not known', async () => {
    const { gl, read, commit } = await setup();
    await commit((s) => void (s.agents[AGENT]!['dep-bump.patch']!.tier = 'supervised'));
    const c2 = await commit((s) => void (s.agents[AGENT]!['code-fix.patch']!.tier = 'assisted'));
    const h = await readStateHistory(gl.port, POLICY_GID, 'main', await read(), createMemory(), 2);
    expect(h.commits).toHaveLength(2);
    expect(h.writerOf(AGENT, 'code-fix.patch')?.id).toBe(c2);
    // c1 wrote it, but its parent was not read: unchanged through every commit read, and the list is not the whole history
    expect(h.writerOf(AGENT, 'dep-bump.patch')).toBeNull();
    // an unreadable revision: nothing is guessed across it
    const mem = createMemory();
    for (const c of await gl.port.listCommits(POLICY_GID, { path: 'tier-state.yml' })) if (c.id !== c2) mem.states.set(c.id, 'unreadable');
    const blind = await readStateHistory(gl.port, POLICY_GID, 'main', await read(), mem);
    expect(blind.writerOf(AGENT, 'code-fix.patch')).toBeNull();
  });

  it('a commit that landed between the two reads: the newest commit does not hold the record, so no writer is named', async () => {
    const { read, commit, gl } = await setup();
    const state = await read();
    await commit((s) => void (s.agents[AGENT]!['dep-bump.patch']!.tier = 'quarantined'));
    const h = await readStateHistory(gl.port, POLICY_GID, 'main', state, createMemory());
    expect(h.writerOf(AGENT, 'dep-bump.patch')).toBeNull();
  });

  it('a revision is read once: a second poll reads only the commit list', async () => {
    const { gl, read, commit } = await setup();
    await commit((s) => void (s.agents[AGENT]!['dep-bump.patch']!.tier = 'supervised'));
    const mem = createMemory();
    await readStateHistory(gl.port, POLICY_GID, 'main', await read(), mem);
    let files = 0;
    const counting = new Proxy(gl.port, { get: (t, k, r) => (k === 'getFile' ? (...a: Parameters<GitLabPort['getFile']>) => (files++, t.getFile(...a)) : Reflect.get(t, k, r)) });
    await readStateHistory(counting, POLICY_GID, 'main', await read(), mem);
    expect(files).toBe(0);
  });
});
