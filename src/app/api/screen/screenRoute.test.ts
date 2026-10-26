// GET /api/screen/<key>: a screen's slices as NDJSON. Never cached; 404 for an unknown or unconverted key; the key one
// percent-encoded segment; live before the first poll an error line with the reason, never a demo payload.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { GET } from './[key]/route';

// Outside Next there is no request scope: connection() (request time, never the build) resolves at once here.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

afterEach(() => {
  setDataSource(null);
  vi.unstubAllEnvs();
});

const call = (key: string, query = '') => GET(new Request(`http://localhost/api/screen/${key}${query}`), { params: Promise.resolve({ key }) });
const lines = async (res: Response) => (await res.text()).trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);

describe('GET /api/screen/[key]', () => {
  it('monitor: its three slices as NDJSON, the fleet first, then _end; not stored by any cache', async () => {
    setDataSource(demoSource);
    const res = await call('monitor');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('content-type')).toContain('application/x-ndjson');
    const out = await lines(res);
    expect(out[0]).toMatchObject({ slice: 'core', status: 'ok' });
    expect(out.map((l) => l.slice).sort()).toEqual(['_end', 'core', 'desk', 'estate']);
    expect(out.at(-1)).toMatchObject({ slice: '_end', status: 'ok' });
    expect(Object.keys(out[0]?.data as object).sort()).toEqual(['asOf', 'deepId', 'groups', 'mode', 'needs', 'org', 'projects', 'stages']);
    expect(Object.keys(out.find((l) => l.slice === 'estate')?.data as object).sort()).toEqual(['stability', 'trend']);
    expect(Object.keys(out.find((l) => l.slice === 'desk')?.data as object)).toEqual(['cost']);
  });

  it('an unknown key, or one no module serves yet, is a 404 that does not echo it', async () => {
    for (const key of ['nope', 'ladder']) {
      const res = await call(key);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'unknown screen' });
    }
  });

  it('decodes a percent-encoded key (a param key is one segment)', async () => {
    setDataSource(demoSource);
    expect((await call(encodeURIComponent('monitor'))).status).toBe(200);
    expect((await call('fleet%2F%5Bproject%5D', '?project=x')).status).toBe(404); // not converted yet: no loader
  });

  it('live before the first poll: the slices say why, never a demo payload', async () => {
    vi.stubEnv('BELAY_MODE', 'live');
    const out = await lines(await call('monitor'));
    expect(out.find((l) => l.slice === 'core')).toMatchObject({ status: 'error' });
    expect(String(out.find((l) => l.slice === 'core')?.reason)).toContain('first poll has not finished');
    expect(JSON.stringify(out)).not.toContain('demo');
  });
});
