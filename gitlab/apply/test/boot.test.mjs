// The write-token job refuses a malformed pin, or a glab test hook, before git or curl sees it: the boot's shape checks, run as the shell CI runs them.
import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const yml = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.gitlab-ci.yml'), 'utf8').split('\n');
const start = yml.findIndex((l) => l.startsWith('    - |')) + 1;
const end = yml.findIndex((l) => l.includes('export AFTERLIFE_DIR='));
const checks = yml.slice(start, end).map((l) => l.slice(6)).join('\n');

const GOOD = {
  engine: { project: 'acme/belay-engine', ref: 'v0.1.0', commit: 'a'.repeat(40) },
  glab: { version: '1.120.0', sha256: 'b'.repeat(64) },
};

function boot(patch = {}, extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-boot-'));
  const cfg = { engine: { ...GOOD.engine, ...patch.engine }, glab: { ...GOOD.glab, ...patch.glab } };
  fs.writeFileSync(path.join(dir, 'apply.json'), JSON.stringify(cfg));
  const r = spawnSync('bash', ['-c', `${checks}\necho BOOT-OK`], { env: { ...process.env, ...extraEnv, CI_PROJECT_DIR: dir.split(path.sep).join('/') }, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  return r;
}

it('accepts the pinned shapes the templates accept', () => {
  const r = boot();
  expect(r.stderr).toBe('');
  expect(r.stdout).toContain('BOOT-OK');
});

const BAD = [
  ['engine.project', { engine: { project: '-evil/x' } }],
  ['engine.project', { engine: { project: 'a b' } }],
  ['engine.ref', { engine: { ref: '--upload-pack=touch /tmp/x' } }],
  ['engine.ref', { engine: { ref: '-v1' } }],
  ['engine.ref', { engine: { ref: 'v1\nmain' } }],
  ['glab.version', { glab: { version: '1.120' } }],
  ['glab.version', { glab: { version: '1.2.3/../x' } }],
  ['glab.sha256', { glab: { sha256: 'b'.repeat(63) } }],
  ['glab.sha256', { glab: { sha256: 'B'.repeat(64) } }],
];
for (const [key, patch] of BAD) {
  it(`refuses a malformed ${key}: ${JSON.stringify(Object.values(patch)[0])}`, () => {
    const r = boot(patch);
    expect(r.status).toBe(2);
    expect(r.stdout).not.toContain('BOOT-OK');
    expect(r.stderr).toContain(key);
  });
}

// The pre-rename BELAY_GLAB is refused as surely as AFTERLIFE_GLAB: either name picks the binary.
for (const hook of [{ AFTERLIFE_GLAB: 'sh|-c|id' }, { AFTERLIFE_GLAB: '' }, { BELAY_GLAB: 'sh|-c|id' }, { FAKE_GLAB_ROUTES: '/tmp/routes.json' }]) {
  it(`refuses the glab test hook in the token-holding job: ${JSON.stringify(hook)}`, () => {
    const r = boot({}, hook);
    expect(r.status).toBe(2);
    expect(r.stdout).not.toContain('BOOT-OK');
    expect(r.stderr).toContain('AFTERLIFE_GLAB, BELAY_GLAB or FAKE_GLAB_* is set');
  });
}

it('still boots with the glab tuning knobs, which pick no binary', () => {
  const r = boot({}, { AFTERLIFE_GLAB_TIMEOUT_MS: '1000', AFTERLIFE_GLAB_BACKOFF_MS: '0' });
  expect(r.stderr).toBe('');
  expect(r.stdout).toContain('BOOT-OK');
});
