// The agent-MR facts: size cached by head sha (an unchanged sha makes no second listDiffs), the head pipeline cached only
// once final (running is read again), a failed read null with an issue (never 0), and at most FACT_READS reads a poll.
import { describe, expect, it } from 'vitest';
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlDiff, GlMergeRequest, GlProject } from '@/server/gitlab/types';
import type { TaskDerivation } from '../derive/task';
import { mr } from '../__tests__/proofs';
import { createMemory, forgetProjects } from '../state';
import { addMrFacts, FACT_READS, pipelineState } from './facts';

const GL: GlProject = { id: 7, name: 'p', path: 'p', pathWithNamespace: 'g/p', defaultBranch: 'main', webUrl: '', visibility: 'private', archived: false, description: null };
const diff = (added: number, removed: number): GlDiff => ({ oldPath: 'a', newPath: 'a', newFile: false, renamedFile: false, deletedFile: false, diff: '', added, removed });

/** A port with one diff list and one pipeline status per poll; it counts its calls. */
function stubPort(state: { status: string; failDiffs?: boolean }) {
  const calls = { listDiffs: 0, get: 0 };
  const port = {
    listDiffs: async () => {
      calls.listDiffs += 1;
      if (state.failDiffs) throw new Error('glab: 502 Bad Gateway (HTTP 502)');
      return [diff(10, 2), diff(3, 0)];
    },
    get: async () => {
      calls.get += 1;
      return { id: 70001, status: state.status };
    },
  } as unknown as GitLabPort;
  return { port, calls };
}

const task = (iid: number) => ({ d: { task: { mrIid: iid, detail: {} } } as unknown as TaskDerivation });
async function poll(port: GitLabPort, mem = createMemory(), mrs: GlMergeRequest[] = [mr({ headPipelineId: 70001 })]) {
  const derived = mrs.map((m) => task(m.iid));
  const issues: string[] = [];
  await addMrFacts(port, mem, GL, mrs, derived, issues);
  return { details: derived.map((x) => x.d.task.detail), issues, mem };
}

describe('pipelineState', () => {
  it.each([['success', 'success'], ['failed', 'failed'], ['canceled', 'canceled'], ['pending', 'running'], ['running', 'running'], ['manual', null], ['skipped', null], [undefined, null]])('%s -> %s', (s, want) => {
    expect(pipelineState(s)).toBe(want);
  });
});

describe('addMrFacts', () => {
  it('sets size (added + removed) and the head pipeline on the task detail', async () => {
    const { port } = stubPort({ status: 'failed' });
    expect((await poll(port)).details[0]).toEqual({ size: 15, pipeline: 'failed' });
  });

  it('a second poll with an unchanged sha makes no listDiffs call; a new head is read again', async () => {
    const { port, calls } = stubPort({ status: 'success' });
    const { mem } = await poll(port);
    await poll(port, mem);
    expect(calls.listDiffs).toBe(1);
    await poll(port, mem, [mr({ headPipelineId: 70001, sha: 'e'.repeat(40) })]);
    expect(calls.listDiffs).toBe(2);
  });

  it('a running pipeline is read again next poll; a final one is not', async () => {
    const state = { status: 'running' };
    const { port, calls } = stubPort(state);
    const first = await poll(port);
    expect(first.details[0]?.pipeline).toBe('running');
    state.status = 'success';
    const second = await poll(port, first.mem);
    expect(second.details[0]?.pipeline).toBe('success');
    await poll(port, first.mem);
    expect(calls.get).toBe(2);
  });

  it('no head sha, no pipeline: null without a call', async () => {
    const { port, calls } = stubPort({ status: 'success' });
    expect((await poll(port, createMemory(), [mr({ sha: null, headPipelineId: null })])).details[0]).toEqual({ size: null, pipeline: null });
    expect(calls).toEqual({ listDiffs: 0, get: 0 });
  });

  it('a failed diff read is null with an issue, never 0, and is not cached', async () => {
    const state = { status: 'success', failDiffs: true };
    const { port, calls } = stubPort(state);
    const { details, issues, mem } = await poll(port);
    expect(details[0]?.size).toBeNull();
    expect(issues[0]).toMatch(/!41 size: diffs not read/);
    state.failDiffs = false;
    expect((await poll(port, mem)).details[0]?.size).toBe(15);
    expect(calls.listDiffs).toBe(2);
  });

  it(`reads at most ${FACT_READS} times a poll and says how many it left`, async () => {
    const { port, calls } = stubPort({ status: 'success' });
    const many = Array.from({ length: 15 }, (_, i) => mr({ iid: i + 1, headPipelineId: 100 + i }));
    const { details, issues } = await poll(port, createMemory(), many);
    expect(calls.listDiffs + calls.get).toBe(FACT_READS);
    expect(details.filter((d) => d.size === null || d.pipeline === null)).toHaveLength(5);
    expect(issues.at(-1)).toMatch(/^10 agent-MR reads .* left for the next poll/);
  });

  it('forgets an MR that left the window, and a project no longer polled', async () => {
    const { port } = stubPort({ status: 'success' });
    const { mem } = await poll(port);
    expect(mem.mrSizes.size).toBe(1);
    await poll(port, mem, []);
    expect(mem.mrSizes.size + mem.mrPipelines.size).toBe(0);
    await poll(port, mem);
    forgetProjects(mem, new Set([8]));
    expect(mem.mrSizes.size + mem.mrPipelines.size).toBe(0);
  });
});
