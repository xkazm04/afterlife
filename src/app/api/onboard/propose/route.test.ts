// POST /api/onboard/propose: the engine is named, never a model; the path resolves to its git toplevel; a missing
// claude, an invalid answer and any other failure each answer their own code.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AB_ENGINE, ClaudeMissingError, DEFAULT_ENGINE, ProposalError, proposeProject } from '@/server/discover';
import { POST } from './route';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));
vi.mock('@/server/discover', async (orig) => ({ ...(await orig<typeof import('@/server/discover')>()), proposeProject: vi.fn() }));

let root = '';
afterEach(() => {
  vi.mocked(proposeProject).mockReset();
  if (root) rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const post = (body: unknown, host = 'localhost:3101') =>
  POST(new Request('http://localhost:3101/api/onboard/propose', { method: 'POST', headers: { host, 'content-type': 'application/json' }, body: JSON.stringify(body) }));

function repo(): string {
  root = mkdtempSync(join(tmpdir(), 'afterlife-api-propose-'));
  execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
  mkdirSync(join(root, 'sub'));
  return root;
}

const PROPOSAL = { name: 'x', host: { kind: 'none' }, components: [], ci: { provider: 'none', pipelines: [], variants: [] }, cloud: { provider: 'none' }, metrics: [], probes: [] };

describe('POST /api/onboard/propose', () => {
  it('proposes for the toplevel of the path, on the engine named', async () => {
    vi.mocked(proposeProject).mockResolvedValue({ proposal: PROPOSAL as never, ms: 9100, engine: AB_ENGINE, dropped: 1 });
    const res = await post({ root: join(repo(), 'sub'), engine: 'haiku' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ms: 9100, dropped: 1, engine: AB_ENGINE, proposal: PROPOSAL, ciFiles: [] });
    const [top, engine] = vi.mocked(proposeProject).mock.calls[0]!;
    expect(join(top)).toBe(join(body.root));
    expect(join(top).toLowerCase()).toBe(join(root).toLowerCase());
    expect(engine).toEqual(AB_ENGINE);
    await post({ root });
    expect(vi.mocked(proposeProject).mock.calls[1]![1]).toEqual(DEFAULT_ENGINE);
  });

  it('answers each failure with its code', async () => {
    const dir = repo();
    vi.mocked(proposeProject).mockRejectedValueOnce(new ClaudeMissingError('claude is not on PATH'));
    expect([(await post({ root: dir })).status]).toEqual([503]);
    vi.mocked(proposeProject).mockRejectedValueOnce(new ProposalError('the proposal names no project'));
    const invalid = await post({ root: dir });
    expect([invalid.status, (await invalid.json()).code]).toEqual([422, 'invalid']);
    vi.mocked(proposeProject).mockRejectedValueOnce(new Error('claude failed (exit 1): 529\nmore'));
    expect(await (await post({ root: dir })).json()).toEqual({ code: 'failed', error: 'claude failed (exit 1): 529' });
  });

  it('refuses a bad body, a path that is no repo, a model string and another host, running nothing', async () => {
    expect((await post({ root: 'relative/path' })).status).toBe(400);
    expect(await (await post({ root: tmpdir() })).json()).toMatchObject({ code: 'bad-root' });
    expect((await post({ root: repo(), engine: 'claude-opus-5-5' })).status).toBe(400);
    expect((await post([1, 2])).status).toBe(400);
    expect((await post({ root }, 'evil.example')).status).toBe(403);
    expect(proposeProject).not.toHaveBeenCalled();
  });
});
