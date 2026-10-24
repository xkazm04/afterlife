// One GitLab 502 or 429 used to turn a whole loop red: glab() ran once, so apply-gate, the tripwire, post-proof and
// collect-facts failed on the first transient answer. A read (GET, GraphQL query) now gets ATTEMPTS tries on 429, 502, 503,
// 504 or no HTTP answer, and the last failure is thrown as it came. A 4xx is never tried again, and a write never blindly.
// Against fake-glab.mjs (`__transient` routes; fixtures in glab-retry.fixture.mjs); the backoff sleep is recorded, never
// waited. A hung glab, writeFile and a job script are in glab-retry.callers.test.mjs.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { calls, cleanup, flaky, load, MR, serve, slept, thrown, writes } from './glab-retry.fixture.mjs';

vi.setConfig({ testTimeout: 120_000 }); // every call spawns node (see fail-closed-reads.test.mjs)

let lib;
beforeAll(async () => {
  ({ lib } = await load());
});
afterAll(cleanup);

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
