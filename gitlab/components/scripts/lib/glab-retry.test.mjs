// One GitLab 502 or 429 used to turn a whole loop red: glab() ran once, so apply-gate, the tripwire, post-proof and
// collect-facts failed on the first transient answer. A read (GET, GraphQL query) now gets ATTEMPTS tries on 429, 502, 503,
// 504 or no HTTP answer, and the last failure is thrown as it came. A 4xx is never tried again, and a write never blindly.
// Against fake-glab.mjs (`__transient` routes); the backoff sleep is recorded, never waited.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000 }); // every call spawns node (see fail-closed-reads.test.mjs)

// lib.mjs picks its glab and host when it is first loaded, and harness.mjs loads it: both are imported only after the fake
// is named, so no call here can reach a real glab or a real GitLab.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-glab-retry-'));
const ROUTES = path.join(dir, 'routes.json');
const WRITES = path.join(dir, 'writes.jsonl');
process.env.BELAY_GLAB = `${process.execPath}|${path.resolve(import.meta.dirname, '..', 'testing', 'fake-glab.mjs')}`;
process.env.CI_SERVER_FQDN = 'gitlab.invalid';
process.env.FAKE_GLAB_ROUTES = ROUTES;
process.env.FAKE_GLAB_WRITES = WRITES;
let lib;
let harness;
let slept = [];

beforeAll(async () => {
  lib = await import('./lib.mjs');
  harness = await import('../testing/harness.mjs');
  lib.setSleep((ms) => slept.push(ms));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const serve = (routes) => {
  fs.writeFileSync(ROUTES, JSON.stringify(routes));
  fs.rmSync(`${ROUTES}.calls.json`, { force: true });
  fs.writeFileSync(WRITES, '');
  slept = [];
};
const calls = (key) => (fs.existsSync(`${ROUTES}.calls.json`) ? JSON.parse(fs.readFileSync(`${ROUTES}.calls.json`, 'utf8'))[key] ?? 0 : 0);
const writes = () => fs.readFileSync(WRITES, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const thrown = (fn) => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('did not throw');
};

const MR = 'projects/1/merge_requests/7';
const flaky = (faults, then) => ({ __transient: faults, then });

describe('a read', () => {
  it('that fails twice with 502 and then answers returns the answer, after 0.5 s and 1 s', () => {
    serve({ [MR]: flaky([502, 502], { iid: 7 }) });
    expect(lib.api(MR)).toEqual({ iid: 7 });
    expect(calls(MR)).toBe(3);
    expect(slept).toEqual([500, 1000]);
  });

  it('that fails three times still throws the last failure as glab gave it', () => {
    serve({ [MR]: flaky([502, 503, 504], { iid: 7 }) });
    const e = thrown(() => lib.api(MR));
    expect(calls(MR)).toBe(3);
    expect(lib.httpStatus(e)).toBe(504);
    expect(e.message).toBe('glab: 504 transient (HTTP 504)');
  });

  it('is tried again on 429 and on a dropped connection', () => {
    serve({ [MR]: flaky([429, 'net'], { iid: 7 }) });
    expect(lib.api(MR)).toEqual({ iid: 7 });
    expect(calls(MR)).toBe(3);
  });

  it('waits what Retry-After asks when glab shows it, never more than 5 s', () => {
    serve({ [MR]: flaky([{ status: 429, retryAfter: 2 }, { status: 429, retryAfter: 600 }], { iid: 7 }) });
    expect(lib.api(MR)).toEqual({ iid: 7 });
    expect(slept).toEqual([2000, 5000]);
  });

  it.each([401, 403, 404, 409, 422, 500])('that fails with %i is not tried again', (status) => {
    serve({ [MR]: flaky([status], { iid: 7 }) });
    expect(lib.httpStatus(thrown(() => lib.api(MR)))).toBe(status);
    expect(calls(MR)).toBe(1);
    expect(slept).toEqual([]);
  });

  it('that fails with no HTTP status and no network message (no login) is not tried again', () => {
    serve({}); // fake-glab: "not faked", exit 1
    expect(() => lib.api(MR)).toThrow(/is not faked/);
    expect(slept).toEqual([]);
  });

  it('retries each page of a list on its own, and a strict list still refuses past its cap', () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    serve({ 'projects/1/jobs': flaky([502], { __pages: [full, [{ id: 100 }]] }) });
    expect(lib.apiAll('projects/1/jobs', 5, { strict: true })).toHaveLength(101);
    serve({ 'projects/1/jobs': flaky([502], { __pages: [full, full] }) });
    expect(() => lib.apiAll('projects/1/jobs', 2, { strict: true })).toThrow(/refusing to guess/);
  });

  it('through GraphQL: a query is tried again, a mutation is not', () => {
    const q = 'query { vulnerability(id: "gid://gitlab/Vulnerability/9") { state } }';
    serve({ [`query=${q}`]: flaky([502], { data: { vulnerability: { state: 'RESOLVED' } } }) });
    expect(lib.gql(q).data.vulnerability.state).toBe('RESOLVED');
    const m = 'mutation { vulnerabilityDismiss(input: {id: "gid://gitlab/Vulnerability/9"}) { errors } }';
    serve({ [`query=${m}`]: flaky([502], { data: {} }) });
    expect(lib.httpStatus(thrown(() => lib.gql(m)))).toBe(502);
    expect(calls(`query=${m}`)).toBe(1);
  });

  // GraphQL reports a failure in a 200 answer's `errors`. Read as data, it was "no vulnerability state": a reopened
  // finding the token could not see demoted nobody (detect.mjs step 4).
  it('through GraphQL: an answer that carries errors throws, never reads as data', () => {
    const q = 'query { vulnerability(id: "gid://gitlab/Vulnerability/9") { state } }';
    serve({ [`query=${q}`]: { data: { vulnerability: null }, errors: [{ message: 'The resource that you are attempting to access does not exist or you don\'t have permission' }] } });
    expect(() => lib.gql(q)).toThrow(/GraphQL.*does not exist or you don't have permission/);
    serve({ [`query=${q}`]: { data: { vulnerability: null } } }); // no such vulnerability, and no error: data
    expect(lib.gql(q)).toEqual({ data: { vulnerability: null } });
  });
});

describe('a write', () => {
  it('that fails with 502 is not tried again, and says it may or may not have landed', () => {
    serve({ [`POST ${MR}/notes`]: flaky([502], { reply: {} }) });
    const e = thrown(() => lib.api(`${MR}/notes`, { method: 'POST', body: { body: 'x' } }));
    expect(lib.httpStatus(e)).toBe(502);
    expect(e.landed).toBe('unknown');
    expect(e.message).toMatch(/may or may not have landed/);
    expect(calls(`POST ${MR}/notes`)).toBe(1);
    expect(writes()).toEqual([]);
    expect(slept).toEqual([]);
  });

  it('that loses its connection is not tried again either', () => {
    serve({ [`PUT ${MR}`]: flaky(['net'], { reply: {} }) });
    expect(thrown(() => lib.api(MR, { method: 'PUT', body: { labels: 'x' } })).landed).toBe('unknown');
    expect(calls(`PUT ${MR}`)).toBe(1);
  });

  it.each([403, 409, 422, 429])('that fails with %i is thrown as it came: GitLab did not do it', (status) => {
    serve({ [`POST ${MR}/notes`]: flaky([status], { reply: {} }) });
    const e = thrown(() => lib.api(`${MR}/notes`, { method: 'POST', body: { body: 'x' } }));
    expect(lib.httpStatus(e)).toBe(status);
    expect(e.landed).toBeUndefined();
    expect(e.message).toBe(`glab: ${status} transient (HTTP ${status})`);
    expect(calls(`POST ${MR}/notes`)).toBe(1);
  });

  it('through glab mr (note, label, approve, merge) is not tried again', () => {
    serve({ 'GLAB mr merge': flaky([503]) });
    const e = thrown(() => lib.glab(['mr', 'merge', '7', '-R', 'https://gitlab.example/acme/app', '--auto-merge', '--sha', 'a'.repeat(40), '--yes']));
    expect(e.message).toMatch(/HTTP 503.*may or may not have landed/);
    expect(calls('GLAB mr merge')).toBe(1);
    expect(writes()).toEqual([]);
  });

  it('is made again only when the read it names shows it did not land', () => {
    const probe = vi.fn(() => true);
    serve({ [`POST ${MR}/notes`]: flaky([502], { reply: { id: 1 } }) });
    expect(lib.api(`${MR}/notes`, { method: 'POST', body: { body: 'x' }, unlanded: probe })).toEqual({ id: 1 });
    expect(probe).toHaveBeenCalledTimes(1);
    expect(writes()).toHaveLength(1);
    for (const unlanded of [() => false, () => 'yes', () => { throw new Error('read failed'); }]) {
      serve({ [`POST ${MR}/notes`]: flaky([502], { reply: { id: 1 } }) });
      expect(thrown(() => lib.api(`${MR}/notes`, { method: 'POST', body: { body: 'x' }, unlanded })).landed).toBe('unknown');
      expect(calls(`POST ${MR}/notes`)).toBe(1);
    }
  });
});

// Only hangs are timed here: a call that must answer in time would turn red on a slow machine, not on a bug.
describe('a glab that hangs', () => {
  beforeAll(() => {
    process.env.BELAY_GLAB_TIMEOUT_MS = '3000';
  });
  afterAll(() => {
    delete process.env.BELAY_GLAB_TIMEOUT_MS;
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
  const write = async (o) => (await import('./repo-write.mjs')).writeFile({ project: PROJECT, branch: 'main', path: 'events/1.jsonl', content: 'x\ny\n', message: 'ledger', ...o });

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
    routes: { [MR]: flaky(faults, mr) }, env: { BELAY_GLAB_BACKOFF_MS: '0' },
  });
  beforeEach(() => fs.rmSync(path.join(dirJob, 'mr.env'), { force: true }));

  it('passes when its read fails twice with 502 and then answers', () => {
    const r = context([502, 502]);
    expect(r.code, r.stderr).toBe(0);
    expect(fs.readFileSync(path.join(dirJob, 'mr.env'), 'utf8')).toMatch(/^BELAY_HEAD_SHA=c{40}$/m);
    expect(r.stderr).toMatch(/attempt 3 of 3/);
  });

  it('fails, writing nothing, when its read fails three times', () => {
    const r = context([502, 502, 502]);
    expect(r.code).not.toBe(0);
    expect(fs.existsSync(path.join(dirJob, 'mr.env'))).toBe(false);
  });
});
