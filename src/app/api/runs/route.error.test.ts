// GET /api/runs when the read throws: a 503 with a fixed body, never the fs message or its path (the route is public in
// the hosted replay), and still never stored by a cache.
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/features/theater/live/server/livePayload', () => ({
  loadLivePayload: () => {
    throw new Error("EACCES: permission denied, scandir 'C:/secret/.belay/runs'");
  },
}));

const { GET } = await import('./route');

afterEach(() => vi.restoreAllMocks());

describe('GET /api/runs on a read that throws', () => {
  it('answers 503 { error: "runs unreadable" }, no-store, and logs the reason on the server only', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'runs unreadable' });
    expect(text).not.toMatch(/secret|EACCES/);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('EACCES'));
  });
});
