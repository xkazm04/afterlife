// The re-measure actions are endpoints: refused on the hosted replay, for an unknown slug or claim id, and off this
// machine, before anything is measured; a passive answer is worded from the measure step's own answer.
import { afterEach, describe, expect, it, vi } from 'vitest';

const hit = vi.hoisted(() => ({ passive: 0, local: 0, host: 'localhost:3000' }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: hit.host }) }));
vi.mock('next/cache', () => ({ refresh: () => {} }));
vi.mock('@/server/discover', () => ({ loadProjects: () => [{ slug: 'grinex-portal' }] }));
vi.mock('@/server/vitals', () => ({
  passiveMeasure: async () => (hit.passive++, { status: 'waiting', after: 2, of: 5, message: 'waiting: 2 of 5 after' }),
  localMeasure: async () => (hit.local++, { status: 'refused', reason: 'no runner block' }),
}));

const { measureLocalAction, measurePassiveAction } = await import('./remeasure');

afterEach(() => {
  vi.unstubAllEnvs();
  hit.passive = 0;
  hit.local = 0;
  hit.host = 'localhost:3000';
});

describe('re-measure actions', () => {
  it('refuse on the replay, for an unknown slug or a bad claim id, and off this machine; nothing is measured', async () => {
    vi.stubEnv('AFTERLIFE_MODE', 'replay');
    expect(await measurePassiveAction('grinex-portal', 'c1')).toEqual({ ok: false, error: 'the hosted replay has no real project to measure' });
    vi.unstubAllEnvs();
    expect((await measurePassiveAction('ghost', 'c1')).ok).toBe(false);
    expect((await measureLocalAction('grinex-portal', '../x')).ok).toBe(false);
    hit.host = 'evil.example';
    expect((await measurePassiveAction('grinex-portal', 'c1')).ok).toBe(false);
    expect(hit.passive + hit.local).toBe(0);
  });

  it('words a passive answer, and starts a local one in the background', async () => {
    expect(await measurePassiveAction('grinex-portal', 'c1')).toEqual({ ok: true, message: 'Not yet: waiting: 2 of 5 after' });
    const r = await measureLocalAction('grinex-portal', 'c1');
    expect(r.ok && r.message).toMatch(/^Measuring locally/);
  });
});
