// refreshVitals is a public endpoint: on the hosted replay, and for a slug no saved project has, it refuses before
// anything runs - no CLI spawned, no file written, no re-render. A request not addressed to this machine is refused too,
// since a collect reads the providers as the operator's own az / glab login.
import { afterEach, describe, expect, it, vi } from 'vitest';

const hit = vi.hoisted(() => ({ refresh: 0, collect: 0, host: 'localhost:3000' }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: hit.host }) }));
vi.mock('next/cache', () => ({ refresh: () => { hit.refresh++; } }));
vi.mock('@/server/discover', () => ({ loadProjects: () => [{ slug: 'grinex-portal' }] }));
vi.mock('@/server/vitals', () => ({
  measureQueuedAll: () => [],
  collectProject: async (slug: string) => {
    hit.collect++;
    if (slug === 'grinex-portal') return { slug, ci: { added: 2, total: 9 }, prod: { added: 48 }, probes: [] };
    throw new Error('vitals: collectProject not built (WP2)');
  },
}));

const { refreshVitals } = await import('./actions');
const { clearJobs, jobOf } = await import('./jobs');

afterEach(() => {
  vi.unstubAllEnvs();
  hit.refresh = 0;
  hit.collect = 0;
  hit.host = 'localhost:3000';
  clearJobs();
});

describe('refreshVitals', () => {
  it.each([['replay'], ['demo'], [undefined]])('BELAY_MODE=%s, an unknown slug: refused, nothing collected or re-rendered', async (mode) => {
    vi.stubEnv('BELAY_MODE', mode);
    expect(await refreshVitals('p-anything')).toMatchObject({ ok: false });
    expect(await refreshVitals(42)).toMatchObject({ ok: false });
    expect(hit).toMatchObject({ refresh: 0, collect: 0 });
  });
  it('the hosted replay refuses even a saved slug', async () => {
    vi.stubEnv('BELAY_MODE', 'replay');
    expect(await refreshVitals('grinex-portal')).toEqual({ ok: false, error: 'the hosted replay has no real project to collect' });
    expect(hit.collect).toBe(0);
  });
  it('a request not addressed to this machine is refused', async () => {
    hit.host = 'evil.example';
    expect(await refreshVitals('grinex-portal')).toMatchObject({ ok: false, error: expect.stringContaining('not localhost') });
    expect(hit.collect).toBe(0);
  });
  it('a saved slug from this machine: starts the job and answers at once, then the job records what it added', async () => {
    const r = await refreshVitals('grinex-portal');
    expect(r).toMatchObject({ ok: true, job: { startedAt: expect.any(String) } });
    expect(r.ok && r.job).not.toHaveProperty('done'); // answered before the collect settled
    expect(hit.refresh).toBe(1);
    await vi.waitFor(() => expect(jobOf('grinex-portal')?.done).toBeDefined());
    expect(jobOf('grinex-portal')).toMatchObject({ added: 2, total: 9, prodAdded: 48, probes: [] });
    expect(hit.collect).toBe(1);
  });
});
