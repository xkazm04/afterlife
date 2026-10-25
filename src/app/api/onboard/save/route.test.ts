// POST /api/onboard/save: the probe route's sealed results confirm the lines that are saved; a result handed in
// without the server's seal is left out, so a forged `ok` saves nothing.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as probe } from '../probe/route';
import { POST } from './route';

vi.mock('next/server', () => ({ connection: () => Promise.resolve() }));

let base = '';
afterEach(() => {
  vi.unstubAllEnvs();
  if (base) rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const req = (url: string, body: unknown) => new Request(`http://localhost:3101${url}`, { method: 'POST', headers: { host: 'localhost:3101' }, body: JSON.stringify(body) });

const PROPOSAL = {
  name: 'Shop Web',
  host: { kind: 'azure-devops', org: 'acme', project: 'Shop' },
  components: [{ id: 'app', path: '.', stack: 'node', tests: ['npm test'] }, { id: 'docs', path: 'docs', stack: 'md' }, { id: 'ghost', path: 'ghost', stack: 'x' }],
  ci: { provider: 'azure-pipelines', pipelines: [{ id: '2', name: 'Shop' }], variants: [{ id: 'master-full', pipelineId: '2', match: { branch: 'master' } }] },
  cloud: { provider: 'azure-app-insights', hint: { resourceGroup: 'rg' } },
  metrics: [],
  probes: [],
};

describe('POST /api/onboard/save', () => {
  it('saves what the sealed probes confirmed, drops a forged ok, and answers the slug', async () => {
    base = mkdtempSync(join(tmpdir(), 'belay-api-save-'));
    vi.stubEnv('BELAY_DATA_DIR', join(base, 'data'));
    const root = join(base, 'repo');
    execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
    execFileSync('git', ['-C', root, 'remote', 'add', 'origin', 'https://dev.azure.com/acme/Shop/_git/Shop%20Web'], { stdio: 'ignore' });
    mkdirSync(join(root, 'docs'));
    const sealed = await (await probe(req('/api/onboard/probe', { root, spec: { kind: 'git-remote', args: {} } }))).json();
    const forged = { result: { kind: 'az-devops-pipelines', args: { org: 'acme', project: 'Shop' }, status: 'ok', summary: '1 pipeline', data: { pipelineIds: '2' }, at: '2026-10-25T09:00:00.000Z', ms: 1 }, seal: '0'.repeat(64) };

    const res = await POST(req('/api/onboard/save', { root, engine: 'sonnet', proposal: PROPOSAL, results: [sealed, forged] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ slug: 'shop-web', unsealed: 1 });
    const yml = readFileSync(join(base, 'data', 'projects', 'shop-web.yml'), 'utf8');
    expect(yml).toContain('kind: azure-devops');
    expect(yml).toContain('id: docs');
    expect(yml).not.toContain('ghost');
    expect(yml).not.toContain('master-full');
    expect(yml).toContain('provider: none');
    expect(yml).toContain('model: claude-sonnet-5-5');
  });

  it('refuses a body with no results and an invalid proposal', async () => {
    base = mkdtempSync(join(tmpdir(), 'belay-api-save-'));
    execFileSync('git', ['init', '-q', base], { stdio: 'ignore' });
    expect((await POST(req('/api/onboard/save', { root: base }))).status).toBe(400);
    const res = await POST(req('/api/onboard/save', { root: base, proposal: { host: {} }, results: [] }));
    expect([res.status, (await res.json()).code]).toEqual([422, 'invalid']);
  });
});
