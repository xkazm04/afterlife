// GET /api/runs: the runner's files under AFTERLIFE_DATA_DIR as JSON, read on each request and never stored by a cache,
// since Theater's live film polls it every 2 s.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WAVE_2_RUNNING } from '@/lib/runs/fixture';
import { GET } from './route';

// Outside Next there is no request scope: connection() (request time, never the build) resolves at once here.
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

let root = '';
afterEach(() => {
  vi.unstubAllEnvs();
  if (root) rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('GET /api/runs', () => {
  it('answers the runs under AFTERLIFE_DATA_DIR with the live meta, not stored by any cache, and sees a new wave on the next call', async () => {
    root = mkdtempSync(join(tmpdir(), 'afterlife-api-runs-'));
    vi.stubEnv('AFTERLIFE_DATA_DIR', root);
    const empty = await GET();
    expect(empty.status).toBe(200);
    expect(empty.headers.get('cache-control')).toContain('no-store');
    expect(await empty.json()).toMatchObject({ repos: [], meta: {} });

    mkdirSync(join(root, 'runs', 'alpha'), { recursive: true });
    writeFileSync(join(root, 'runs', 'alpha', '2.jsonl'), `${WAVE_2_RUNNING.join('\n')}\n`);
    const body = await (await GET()).json();
    expect(body.repos.map((r: { repo: string }) => r.repo)).toEqual(['alpha']);
    expect(Object.keys(body.meta)).toEqual(['alpha/2']);
    expect(typeof body.generatedAt).toBe('number');
  });
});
