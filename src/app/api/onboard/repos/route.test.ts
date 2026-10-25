// GET /api/onboard/repos: discover's listing as JSON, never stored by a cache, and only for a request addressed to this
// machine. The listing itself is tested over a fixture projects dir (discover/repos).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClaudeRepo } from '@/schemas/vitals';
import { listClaudeRepos } from '@/server/discover';
import { GET } from './route';

// Outside Next there is no request scope: connection() (request time, never the build) resolves at once here.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
vi.mock('@/server/discover', async (orig) => ({ ...(await orig<typeof import('@/server/discover')>()), listClaudeRepos: vi.fn() }));

afterEach(() => vi.mocked(listClaudeRepos).mockReset());

const req = (host = 'localhost:3101') => new Request('http://localhost:3101/api/onboard/repos', { headers: { host } });
const REPO: ClaudeRepo = { root: 'C:/Users/x/refactoring', name: 'Grinex Portal', lastUsed: '2026-10-25T08:00:00.000Z', branch: 'master', hostKind: 'azure-devops', onboarded: 'grinex-portal' };

describe('GET /api/onboard/repos', () => {
  it('answers the listing, not stored by any cache', async () => {
    vi.mocked(listClaudeRepos).mockResolvedValue([REPO]);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await res.json()).toEqual({ repos: [REPO] });
  });

  it('a listing that throws is a 500 that says so', async () => {
    vi.mocked(listClaudeRepos).mockRejectedValue(new Error('EACCES: projects\nstack'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ code: 'failed', error: 'could not list your Claude Code repos: EACCES: projects' });
  });

  it('refuses a request that names another host, and lists nothing for it', async () => {
    const res = await GET(req('belay.example.com'));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'not-local' });
    expect(listClaudeRepos).not.toHaveBeenCalled();
  });
});
