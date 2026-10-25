// GET /api/shell/projects: the palette's project list, read apart from the shell. Never cached; before the first live
// poll a 503 with the reason, never the demo's projects in live mode.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { readShellProjects } from '@/server/data/shell/read';
import { GET } from './route';

// Outside Next there is no request scope: connection() resolves at once here.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

afterEach(() => {
  setDataSource(null);
  vi.unstubAllEnvs();
});

describe('GET /api/shell/projects', () => {
  it('answers every project, as small as the palette needs, not stored by any cache', async () => {
    setDataSource(demoSource);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ projects: readShellProjects(demoSource) });
    expect(body.projects).toHaveLength(demoSource.getFleet().projects.length);
    expect(Object.keys(body.projects[0]).sort()).toEqual(['group', 'id', 'name', 'state']);
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('live before the first poll: 503 with the reason, never a demo list', async () => {
    vi.stubEnv('BELAY_MODE', 'live');
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect((await res.json()).error).toContain('first poll has not finished');
  });

  it('any other throw: 503 with a fixed body, never the message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setDataSource({ ...demoSource, getFleet: () => { throw new Error('EACCES: /srv/belay/index'); } });
    const res = await GET();
    expect([res.status, await res.json()]).toEqual([503, { error: 'shell unreadable' }]);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
