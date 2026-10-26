// The /api/start routes answer only a request addressed to this machine: another Host gets 403 and nothing runs (no probe,
// no git, no claude, no save). The ask route names a missing claude and validates its body.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { probeDeps } from '@/app/features/start/data/probe';
import { deriveFor } from '@/app/features/start/data/derive';
import { askAfterlife } from '@/server/discover/ask/ask';
import { ClaudeMissingError, saveProject } from '@/server/discover';
import { POST as ask } from './ask/route';
import { POST as derive } from './derive/route';
import { GET as probe } from './probe/route';
import { POST as save } from './save/route';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
vi.mock('@/app/features/start/data/probe', async (orig) => ({ ...(await orig<object>()), probeDeps: vi.fn() }));
vi.mock('@/app/features/start/data/derive', async (orig) => ({ ...(await orig<object>()), deriveFor: vi.fn(), deriveDeps: vi.fn() }));
vi.mock('@/server/discover/ask/ask', async (orig) => ({ ...(await orig<object>()), askAfterlife: vi.fn() }));
vi.mock('@/server/discover', async (orig) => ({ ...(await orig<typeof import('@/server/discover')>()), saveProject: vi.fn() }));

afterEach(() => vi.clearAllMocks());

const req = (path: string, host: string, body?: unknown): Request =>
  new Request(`http://localhost:3101${path}`, body === undefined ? { headers: { host } } : { method: 'POST', headers: { host, 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('every /api/start route', () => {
  it('refuses another host with 403, running nothing', async () => {
    const r = await probe(req('/api/start/probe', 'evil.example'));
    expect([r.status, r.headers.get('content-type')]).toEqual([403, 'application/x-ndjson; charset=utf-8']);
    expect(JSON.parse(await r.text())).toMatchObject({ t: 'refused', reason: expect.stringMatching(/not localhost/) });
    for (const [route, path, body] of [[derive, '/api/start/derive', { root: '/r' }], [ask, '/api/start/ask', { turns: [], state: {} }], [save, '/api/start/save', { root: '/r', results: [] }]] as const) {
      const res = await route(req(path, 'evil.example', body));
      expect([path, res.status, (await res.json()).code]).toEqual([path, 403, 'not-local']);
    }
    expect([probeDeps, deriveFor, askAfterlife, saveProject].map((f) => vi.mocked(f).mock.calls.length)).toEqual([0, 0, 0, 0]);
  });
});

describe('POST /api/start/ask', () => {
  it('answers the validated turn, a bad body 400 and a missing claude 503', async () => {
    vi.mocked(askAfterlife).mockResolvedValueOnce({ reply: 'Log in.', action: { kind: 'glab-login' }, ms: 5 });
    const res = await ask(req('/api/start/ask', 'localhost:3101', { turns: [{ role: 'you', text: 'hi' }], state: { steps: [] } }));
    expect([res.status, await res.json()]).toEqual([200, { reply: 'Log in.', action: { kind: 'glab-login' }, ms: 5 }]);
    expect((await ask(req('/api/start/ask', 'localhost:3101', { turns: 'x' }))).status).toBe(400);
    vi.mocked(askAfterlife).mockRejectedValueOnce(new ClaudeMissingError('claude is not on PATH'));
    const missing = await ask(req('/api/start/ask', 'localhost:3101', { turns: [], state: {} }));
    expect([missing.status, (await missing.json()).code]).toEqual([503, 'claude-missing']);
  });
});
