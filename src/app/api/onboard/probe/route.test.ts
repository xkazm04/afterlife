// POST /api/onboard/probe: one validated probe and the server's seal over its result; a failed probe is a 200 with a
// fail line, a spec Afterlife does not run is refused before anything runs.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifySeal } from '@/server/discover';
import { POST } from './route';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const post = (body: unknown, host = 'localhost:3101') =>
  POST(new Request('http://localhost:3101/api/onboard/probe', { method: 'POST', headers: { host }, body: JSON.stringify(body) }));

describe('POST /api/onboard/probe', () => {
  it('runs the probe and seals its result', async () => {
    root = mkdtempSync(join(tmpdir(), 'belay-api-probe-'));
    execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
    const res = await post({ root, spec: { kind: 'git-root', args: {} } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toMatchObject({ kind: 'git-root', status: 'ok' });
    expect(verifySeal(body, body.result.data.root)).toBe(true);

    const pipelines = await (await post({ root, spec: { kind: 'az-devops-pipelines', args: { org: 'acme', project: 'Shop' } } })).json();
    expect(pipelines.result).toMatchObject({ status: 'fail', summary: 'providers: ciProvider not built (WP2)' });
  });

  it('refuses an unknown kind, an arg the kind does not take, and another host', async () => {
    root = mkdtempSync(join(tmpdir(), 'belay-api-probe-'));
    execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
    expect((await post({ root, spec: { kind: 'shell', args: { cmd: 'rm -rf /' } } })).status).toBe(400);
    expect((await post({ root, spec: { kind: 'git-root', args: { cmd: 'x' } } })).status).toBe(400);
    expect((await post({ root, spec: { kind: 'git-root', args: {} } }, 'evil.example')).status).toBe(403);
  });
});
