// The probe stream over a fake GitLab: the preflight's four nodes come before any row, each row as it settles, then the
// doctor and setup nodes and the whole read; a blocked login still streams; a GitLab that never answers ends at the hard stop.
import { describe, expect, it } from 'vitest';
import { GitLabError } from '@/server/gitlab/errors';
import { createFakeGitLab } from '@/server/gitlab/fake/fakeGitLab';
import type { GitLabPort } from '@/server/gitlab/port';
import type { ProbeEvent, TraceFacts } from '../model/types';
import { probeStream, type ProbeDeps } from './probe';

const FACTS: TraceFacts = { mode: 'live', fake: false, groupId: '144060371', groupSet: true, host: 'gitlab.com', gate: null, rehearsal: false, reason: null, projects: 3 };
const deps = (port: GitLabPort, over: Partial<ProbeDeps> = {}): ProbeDeps => ({
  port: async () => port, groupId: '144060371', facts: FACTS, source: 'glab', now: () => new Date(2026, 9, 26, 14, 22, 5), limitMs: 5_000, ...over,
});

async function read(s: ReadableStream<Uint8Array>): Promise<ProbeEvent[]> {
  const text = await new Response(s).text();
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as ProbeEvent);
}

/** The port with one read replaced. */
const swap = (port: GitLabPort, key: keyof GitLabPort, f: unknown): GitLabPort =>
  new Proxy(port, { get: (t, k, r) => (k === key ? f : Reflect.get(t, k, r)) });

describe('the probe stream', () => {
  it('sends the preflight nodes before any capability row, then the doctor, setup and the whole read', async () => {
    const events = await read(probeStream(deps(createFakeGitLab().port)));
    const at = (p: (e: ProbeEvent) => boolean) => events.findIndex(p);
    const firstCap = at((e) => e.t === 'cap');
    const nodes = events.filter((e): e is Extract<ProbeEvent, { t: 'node' }> => e.t === 'node').map((e) => e.key);
    expect(events[0]).toEqual({ t: 'stage', stage: 'preflight' });
    expect(nodes).toEqual(['glab', 'login', 'group', 'live', 'doctor', 'setup']);
    for (const k of ['glab', 'login', 'group', 'live']) expect(at((e) => e.t === 'node' && e.key === k)).toBeLessThan(firstCap);
    expect(at((e) => e.t === 'stage' && e.stage === 'rows')).toBeLessThan(firstCap);
    expect(events.filter((e) => e.t === 'cap')).toHaveLength(11);
    expect(at((e) => e.t === 'node' && e.key === 'doctor')).toBeGreaterThan(events.length - 4);
    const done = events.at(-1);
    expect(done).toMatchObject({ t: 'done', read: { at: '14:22:05', source: 'glab', nodes: { login: { state: 'pass' } } } });
    if (done?.t === 'done') expect(done.read.caps).toHaveLength(11);
  });

  it('streams a login that blocks: the login node fails, every row is blocked, the read has no rows', async () => {
    const port = swap(createFakeGitLab().port, 'currentUser', () => Promise.reject(new GitLabError('auth', '401 Unauthorized', 'glab')));
    const events = await read(probeStream(deps(port)));
    expect(events.find((e) => e.t === 'node' && e.key === 'login')).toMatchObject({ read: { state: 'fail' } });
    expect(events.filter((e) => e.t === 'cap').every((e) => e.t === 'cap' && e.row.reason.startsWith('blocked by'))).toBe(true);
    expect(events.at(-1)).toMatchObject({ t: 'done', read: { caps: null } });
  });

  it('ends with a refused line at the hard stop when GitLab never answers, and when the probe cannot start', async () => {
    const stuck = swap(createFakeGitLab().port, 'currentUser', () => new Promise(() => undefined));
    expect((await read(probeStream(deps(stuck, { limitMs: 30 })))).at(-1)).toEqual({ t: 'refused', reason: 'GitLab did not finish answering in 0.03 s: check again' });
    const broken = await read(probeStream(deps(createFakeGitLab().port, { port: () => Promise.reject(new Error('no glab')) })));
    expect(broken.at(-1)).toEqual({ t: 'refused', reason: 'the probe could not run: no glab' });
  });
});
