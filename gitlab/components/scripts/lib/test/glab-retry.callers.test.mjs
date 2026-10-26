// glab()'s retry rule at its edges and through its callers: a glab that hangs is killed and treated as no answer;
// repo-write's writeFile commits again only when the file shows the first commit did not land; a job script (mr-context)
// passes a read that fails twice. Fixtures in glab-retry.fixture.mjs; the rule itself in glab-retry.test.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { calls, cleanup, dir, flaky, load, MR, serve, thrown, writes } from './glab-retry.fixture.mjs';

vi.setConfig({ testTimeout: 120_000 }); // every call spawns node (see fail-closed-reads.test.mjs)

let lib;
let harness;
beforeAll(async () => {
  ({ lib, harness } = await load());
});
afterAll(cleanup);

// Only hangs are timed here: a call that must answer in time would turn red on a slow machine, not on a bug.
describe('a glab that hangs', () => {
  beforeAll(() => {
    process.env.AFTERLIFE_GLAB_TIMEOUT_MS = '3000';
  });
  afterAll(() => {
    delete process.env.AFTERLIFE_GLAB_TIMEOUT_MS;
  });

  it('is killed at the timeout and, on a read, tried again; the third is thrown with code ETIMEDOUT', () => {
    serve({ [MR]: flaky(['hang', 'hang', 'hang'], { iid: 7 }) });
    const t = Date.now();
    const e = thrown(() => lib.api(MR));
    expect(Date.now() - t).toBeLessThan(60_000); // unkilled, the three would hang 90 s
    expect(calls(MR)).toBe(3);
    expect(e.code).toBe('ETIMEDOUT');
    expect(e.message).toMatch(/gave no answer in 3000 ms/);
  });

  it('on a write is not tried again: it may have landed', () => {
    serve({ [`POST ${MR}/notes`]: flaky(['hang'], { reply: {} }) });
    expect(thrown(() => lib.api(`${MR}/notes`, { method: 'POST', body: { body: 'x' } })).landed).toBe('unknown');
    expect(calls(`POST ${MR}/notes`)).toBe(1);
  });
});

describe('writeFile (belay-policy, belay-ledger)', () => {
  const L1 = '1'.repeat(40);
  const L2 = '2'.repeat(40);
  const PROJECT = 'acme/belay-ledger';
  const FILE = `projects/${encodeURIComponent(PROJECT)}/repository/files/${encodeURIComponent('events/1.jsonl')}`;
  const COMMITS = `POST projects/${encodeURIComponent(PROJECT)}/repository/commits`;
  const head = (id) => ({ content: Buffer.from('x\n').toString('base64'), encoding: 'base64', last_commit_id: id });
  const write = async (o) => (await import('../repo-write.mjs')).writeFile({ project: PROJECT, branch: 'main', path: 'events/1.jsonl', content: 'x\ny\n', message: 'ledger', ...o });

  it('commits again when the file still has the last commit it was computed from: one write lands', async () => {
    serve({ [FILE]: head(L1), [COMMITS]: flaky([502], { reply: { id: 'c' }, current: { 'events/1.jsonl': L1 } }) });
    expect(await write({ exists: true, lastCommitId: L1 })).toEqual({ id: 'c' });
    expect(calls(COMMITS)).toBe(2);
    expect(writes()).toHaveLength(1);
  });

  it('does not commit again when the file moved: the first commit landed, and the error says it may have', async () => {
    serve({ [FILE]: head(L2), [COMMITS]: { ...flaky([502], { reply: { id: 'c' } }), __landed: true } });
    const e = await write({ exists: true, lastCommitId: L1 }).then(() => null, (x) => x);
    expect(e?.landed).toBe('unknown');
    expect(calls(COMMITS)).toBe(1);
    expect(writes()).toHaveLength(1);
  });

  it('creates again only when the file is still not there', async () => {
    serve({ [FILE]: { __http: 404, message: '404 File Not Found' }, [COMMITS]: flaky([503], { reply: { id: 'c' } }) });
    expect(await write({ exists: false })).toEqual({ id: 'c' });
    expect(calls(COMMITS)).toBe(2);
  });

  it('never commits an update again that names no last commit: nothing can show it did not land', async () => {
    serve({ [FILE]: head(L1), [COMMITS]: flaky([502], { reply: { id: 'c' } }) });
    expect((await write({ exists: true }).then(() => null, (x) => x))?.landed).toBe('unknown');
    expect(calls(COMMITS)).toBe(1);
  });
});

describe('a job', () => {
  const dirJob = path.join(dir, 'job');
  fs.mkdirSync(dirJob);
  const mr = {
    iid: 7, author: { username: 'ai-patcher-acme' }, description: 'Fix.\n\nBelay-Task: 01J9Z8Q4N6X3R7T2V5W8Y0ABCD\nBelay-Class: dep-bump.patch',
    diff_refs: { base_sha: 'b'.repeat(40), head_sha: 'c'.repeat(40) },
  };
  const context = (faults) => harness.runScript(dirJob, 'proof/mr-context.mjs', ['--mr', '7', '--out', 'mr.env'], {
    routes: { [MR]: flaky(faults, mr) }, env: { AFTERLIFE_GLAB_BACKOFF_MS: '0' },
  });
  beforeEach(() => fs.rmSync(path.join(dirJob, 'mr.env'), { force: true }));

  it('passes when its read fails twice with 502 and then answers', () => {
    const r = context([502, 502]);
    expect(r.code, r.stderr).toBe(0);
    const env = fs.readFileSync(path.join(dirJob, 'mr.env'), 'utf8');
    expect(env).toMatch(/^AFTERLIFE_HEAD_SHA=c{40}$/m);
    expect(env, 'the pre-rename name too, for a template pinned before the rename').toMatch(/^BELAY_HEAD_SHA=c{40}$/m);
    expect(r.stderr).toMatch(/attempt 3 of 3/);
  });

  it('fails, writing nothing, when its read fails three times', () => {
    const r = context([502, 502, 502]);
    expect(r.code).not.toBe(0);
    expect(fs.existsSync(path.join(dirJob, 'mr.env'))).toBe(false);
  });
});
