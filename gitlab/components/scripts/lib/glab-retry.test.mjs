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
});

describe('a write', () => {
  it('that fails with 502 is not tried again', () => {
    serve({ [`POST ${MR}/notes`]: flaky([502], { reply: {} }) });
    expect(lib.httpStatus(thrown(() => lib.api(`${MR}/notes`, { method: 'POST', body: { body: 'x' } })))).toBe(502);
    expect(calls(`POST ${MR}/notes`)).toBe(1);
    expect(writes()).toEqual([]);
    expect(slept).toEqual([]);
  });

  it('through glab mr (note, label, approve, merge) is not tried again', () => {
    serve({ 'GLAB mr merge': flaky([503]) });
    expect(() => lib.glab(['mr', 'merge', '7', '-R', 'https://gitlab.example/acme/app', '--auto-merge', '--sha', 'a'.repeat(40), '--yes'])).toThrow(/HTTP 503/);
    expect(calls('GLAB mr merge')).toBe(1);
    expect(writes()).toEqual([]);
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
