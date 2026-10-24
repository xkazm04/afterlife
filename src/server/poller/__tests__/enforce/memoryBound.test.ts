// What the poller remembers between cycles stays bounded: tier-state.yml revisions that left the commits read are dropped,
// and so is everything held for a project that is no longer polled (it left the group, or was archived).
import { parse, stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { TierState } from '@/schemas/tier';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { POLICY_GID } from '@/server/gitlab/fake/demo/ids';
import { SEED_NOW } from '@/server/index/seed';
import { createMemory, forgetProjects } from '../../state';
import { readStateHistory } from '../../stateHistory';
import { rig } from '../helpers';

describe('tier-state revisions in memory', () => {
  it('never outnumber the commits the last poll read, however many land', async () => {
    const gl = createDemoGitLab(SEED_NOW);
    const mem = createMemory();
    const read = async (): Promise<TierState> => parse((await gl.port.getFile(POLICY_GID, 'tier-state.yml', 'main'))!.content) as TierState;
    const sizes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const s = await read();
      s.agents['ai-patcher-acme-lab']!['dep-bump.patch']!.tier = i % 2 ? 'supervised' : 'assisted';
      await gl.port.execute(gl.port.plan.commitFile({ project: POLICY_GID, path: 'tier-state.yml', branch: 'main', content: stringify(s), message: `edit ${i}`, action: 'update' }));
      const h = await readStateHistory(gl.port, POLICY_GID, 'main', await read(), mem, 2);
      sizes.push(mem.states.size);
      expect([...mem.states.keys()].every((k) => h.commits.some((c) => c.id === k))).toBe(true);
    }
    expect(Math.max(...sizes)).toBeLessThanOrEqual(2);
  });
});

describe('forgetProjects', () => {
  it('empties every map createMemory makes of a gone project, keeping the polled one and tier-state commits', () => {
    const mem = createMemory();
    // every map PollMemory holds, read from the memory itself, not from a list: a new one is covered the day it is added
    const maps = Object.entries(mem) as [string, Map<unknown, unknown>][];
    const keyOf = (name: string, id: number): unknown => (name === 'states' ? `commit-${id}` : ['notes', 'mrSizes', 'mrPipelines'].includes(name) ? `${id}!1` : id);
    for (const [name, map] of maps) for (const id of [7, 8]) map.set(keyOf(name, id), {});
    forgetProjects(mem, new Set([8]));
    const left = Object.fromEntries(maps.map(([name, map]) => [name, [...map.keys()]]));
    expect(left).toEqual(Object.fromEntries(maps.map(([name]) => [name, name === 'states' ? ['commit-7', 'commit-8'] : [keyOf(name, 8)]])));
  });
});

describe('a project that left the group', () => {
  it('leaves nothing of its notes, its scan or its belay-ledger files in memory', async () => {
    const x = await rig();
    await x.poll();
    const gone = Number(x.gl.state.projects.find((p) => p.raw.name === 'ledgerline')!.raw.id);
    expect([...x.mem.notes.keys()].some((k) => k.startsWith(`${gone}!`))).toBe(true);
    x.mem.scans.set(gone, { jobId: 7, issue: null });
    x.gl.state.projects = x.gl.state.projects.filter((p) => p.raw.name !== 'ledgerline');
    await x.poll(new Date(SEED_NOW.getTime() + 60_000));
    expect([...x.mem.notes.keys()].filter((k) => k.startsWith(`${gone}!`))).toEqual([]);
    expect([...x.mem.scans.keys()]).not.toContain(gone);
    // and none of the blob ids imported from belay-ledger for it: its ledger file and its cycle file
    expect([...x.mem.ledger.keys(), ...x.mem.cycles.keys()]).not.toContain(gone);
  }, 60_000);
});
