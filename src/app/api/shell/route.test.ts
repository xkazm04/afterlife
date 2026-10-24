// GET /api/shell: the shell's read for the client to re-read on regained focus. Never cached; before the first live poll a
// 503 with the reason, never the demo's numbers in live mode.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { readShellInfo } from '@/server/data/shell/read';
import { GET } from './route';

// Outside Next there is no request scope: connection() (request time, never the build) resolves at once here.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

afterEach(() => {
  setDataSource(null);
  vi.unstubAllEnvs();
});

describe('GET /api/shell', () => {
  it('answers the shell read as JSON, not stored by any cache', async () => {
    setDataSource(demoSource);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(readShellInfo(demoSource));
    expect(body).not.toHaveProperty('projects'); // the palette reads them apart: GET /api/shell/projects
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('live before the first poll: 503 with the reason, never a demo payload', async () => {
    vi.stubEnv('BELAY_MODE', 'live');
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.error).toContain('first poll has not finished');
    expect(JSON.stringify(body)).not.toContain('demo');
  });
});
