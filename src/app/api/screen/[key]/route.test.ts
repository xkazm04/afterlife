// GET /api/screen/<key>: a sample screen's props as its page passes them, as plain JSON. Never cached; 404 for an unknown
// key; live before the first poll a 503 with the reason, never a demo payload.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadScreenProps } from '@/app/features/shell-arms/data/screenProps';
import { toWire } from '@/app/features/shell-arms/model/wire';
import { GET } from './route';

// Outside Next there is no request scope: connection() (request time, never the build) resolves at once here.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

afterEach(() => {
  setDataSource(null);
  vi.unstubAllEnvs();
});

const call = (key: string, query = '') => GET(new Request(`http://localhost/api/screen/${key}${query}`), { params: Promise.resolve({ key }) });

/** The first value JSON would lose or change: a Map, Set, Date, function, non-finite number or null-prototype trick. */
function unserialisable(v: unknown, path = 'props'): string | null {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? null : path;
  if (v === undefined) return null; // an omitted key: the absent-value convention
  if (typeof v !== 'object') return path;
  if (Array.isArray(v)) {
    for (const [i, x] of v.entries()) { const bad = unserialisable(x, `${path}[${i}]`); if (bad) return bad; }
    return null;
  }
  if (Object.getPrototypeOf(v) !== Object.prototype) return path;
  for (const [k, x] of Object.entries(v)) { const bad = unserialisable(x, `${path}.${k}`); if (bad) return bad; }
  return null;
}

describe('GET /api/screen/[key]', () => {
  it.each(['monitor', 'fleet', 'needs-you'])('%s: the envelope as JSON, not stored by any cache, its props plain data', async (key) => {
    setDataSource(demoSource);
    const res = await call(key);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.key).toBe(key);
    expect(new Date(body.asOf).toISOString()).toBe(body.asOf);
    const props = toWire(key as 'monitor', await loadScreenProps(key as 'monitor', new URLSearchParams()));
    expect(unserialisable(props)).toBeNull();
    expect(Object.keys(body.props).sort()).toEqual(Object.keys(props).sort());
  });

  it('the props each page passes its screen', async () => {
    setDataSource(demoSource);
    expect(Object.keys((await (await call('monitor')).json()).props).sort()).toEqual(['data', 'estate']);
    expect(Object.keys((await (await call('fleet')).json()).props).sort()).toEqual(['data', 'estate', 'runner', 'source', 'start']);
    const needs = (await (await call('needs-you')).json()).props;
    expect(Object.keys(needs).sort()).toEqual(['runner', 'view']);
    expect(needs.view.kind).toBe('desk');
  });

  it("fleet: the query passes through to the list's start state", async () => {
    setDataSource(demoSource);
    const plain = (await (await call('fleet')).json()).props.start;
    const searched = (await (await call('fleet', '?q=zeta')).json()).props.start;
    expect(searched).not.toEqual(plain);
  });

  it('an unknown key is a 404 that does not echo it', async () => {
    const res = await call('ladder');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'unknown screen' });
  });

  it('live before the first poll: 503 with the reason, never a demo payload', async () => {
    vi.stubEnv('BELAY_MODE', 'live');
    const res = await call('monitor');
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.error).toContain('first poll has not finished');
    expect(JSON.stringify(body)).not.toContain('demo');
  });

  it('any other throw: 503 with a fixed body, the message only in the server log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setDataSource({ ...demoSource, getFleet: () => { throw new Error("ENOENT: open 'C:\\\\ops\\\\.belay\\\\index'"); } });
    const res = await call('monitor');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'screen unreadable' });
    expect(String(log.mock.calls[0]?.[0])).toContain('ENOENT');
    log.mockRestore();
  });
});
