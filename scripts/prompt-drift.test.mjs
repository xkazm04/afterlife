// prompt-drift: exit 0 when every vendored source still hashes as pinned, 1 when one was edited, 2 when the
// ascent checkout is missing. Runs against a scratch fake ascent dir and manifest, never the real ../ascent.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'prompt-drift.mjs');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

let tmp;
let ascent;
let sources;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-drift-'));
  ascent = path.join(tmp, 'ascent');
  fs.mkdirSync(path.join(ascent, 'src'), { recursive: true });
  fs.writeFileSync(path.join(ascent, 'src/a.ts'), 'export const a = 1;\n');
  sources = path.join(tmp, 'sources.json');
  fs.writeFileSync(
    sources,
    JSON.stringify({ ascent: 'a'.repeat(40), sources: [{ file: 'plan.md', from: [{ path: 'src/a.ts', sha256: hash('export const a = 1;\n') }] }] }),
  );
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const run = (dir) => spawnSync(process.execPath, [script, '--ascent', dir, '--sources', sources], { encoding: 'utf8' });

describe('scripts/prompt-drift.mjs', () => {
  it('exits 0 when sources match', () => {
    expect(run(ascent).status).toBe(0);
  });
  it('treats CRLF checkouts as unchanged', () => {
    fs.writeFileSync(path.join(ascent, 'src/a.ts'), 'export const a = 1;\r\n');
    expect(run(ascent).status).toBe(0);
  });
  it('exits 1 and names the source when one is edited', () => {
    fs.writeFileSync(path.join(ascent, 'src/a.ts'), 'export const a = 2;\n');
    const r = run(ascent);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('src/a.ts');
    expect(r.stdout).toContain('plan.md');
  });
  it('reads an archived source from its ref, not the working tree, and says when the ref is missing', () => {
    const git = (...a) => spawnSync('git', ['-C', ascent, ...a], { encoding: 'utf8' });
    git('init', '-q', '-b', 'master');
    git('config', 'user.email', 't@example.com');
    git('config', 'user.name', 'T');
    fs.writeFileSync(path.join(ascent, 'src/r.ts'), 'export const review = 1;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'review');
    const commit = git('rev-parse', 'HEAD').stdout.trim();
    const ref = 'refs/hygiene-archive/x/experiment';
    git('update-ref', ref, commit);
    const manifest = (pin) => ({ ascent: commit, archive: { ref, tip: commit }, sources: [{ file: 'review.md', from: [{ path: 'src/r.ts', ref: 'archive', commit, sha256: pin }] }] });
    fs.writeFileSync(sources, JSON.stringify(manifest(hash('export const review = 1;\n'))));
    // The working tree moved on; the archived blob did not.
    fs.writeFileSync(path.join(ascent, 'src/r.ts'), 'export const review = 2;\n');
    expect(run(ascent).status).toBe(0);
    fs.writeFileSync(sources, JSON.stringify(manifest(hash('other'))));
    const r = run(ascent);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain(`DRIFT review.md <- ${ref}:src/r.ts`);
    git('update-ref', '-d', ref);
    const gone = run(ascent);
    expect(gone.status).toBe(0);
    expect(gone.stdout).toContain('UNCHECKED review.md');
  });
  it('exits 2 with a hint when the checkout is missing', () => {
    const r = run(path.join(tmp, 'nope'));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('--ascent');
  });
  // Exit 1 means drift; a manifest the script cannot read is a broken check, not a drifted prompt.
  it('exits 2 with one line, not a stack, when sources.json is missing or not JSON', () => {
    fs.rmSync(sources);
    const missing = run(ascent);
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain('prompt-drift: cannot read');
    expect(missing.stderr).not.toContain('node:fs');
    fs.writeFileSync(sources, '{ not json');
    const garbled = run(ascent);
    expect(garbled.status).toBe(2);
    expect(garbled.stderr).toContain('prompt-drift: cannot read');
  });
});
