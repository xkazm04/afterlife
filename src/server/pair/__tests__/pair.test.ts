import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { BELAY_CI, wireCi } from '../ciFile';
import { pair, rootNamespace } from '../pair';
import { planPair } from '../plan';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const REF = { group: 'acme-lab', packVersion: '1.0.0', engineRef: 'v0.1.0' };

function repo(files: Record<string, string> = {}, remote = 'git@gitlab.com:acme-lab/core-banking/ledgerline.git'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-pair-'));
  execFileSync('git', ['init', '-q', dir]);
  if (remote) execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', remote]);
  for (const [p, t] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), t);
  }
  return dir;
}
function run(argv: string[]) {
  let out = '';
  let err = '';
  const r = pair(argv, { out: (s) => (out += s), err: (s) => (err += s), cwd: '/', root: ROOT });
  return { ...r, out, err };
}

describe('belay pair', () => {
  it('prints the plan and writes nothing without --write', () => {
    const dir = repo({ '.gitlab-ci.yml': 'test:\n  script: [npm test]\n' });
    const r = run([dir]);
    expect(r.code).toBe(0);
    expect(r.out).toContain(`create  ${BELAY_CI}`);
    expect(r.out).toContain('$CI_SERVER_FQDN/acme-lab/belay-pack/tier-gate@1.0.0');
    expect(r.out).toMatch(/nothing was written/);
    expect(fs.existsSync(path.join(dir, BELAY_CI))).toBe(false);
    expect(fs.readFileSync(path.join(dir, '.gitlab-ci.yml'), 'utf8')).toBe('test:\n  script: [npm test]\n');
  });

  it('with --write adds the bootstrap, keeps every line of the project, and a second run has nothing to do', () => {
    const ci = '# ours\ninclude:\n  - template: Jobs/SAST.gitlab-ci.yml\n\ntest:\n  script: [npm test]\n';
    const dir = repo({ '.gitlab-ci.yml': ci, '.gitignore': 'node_modules/' });
    expect(run([dir, '--write']).code).toBe(0);
    const after = fs.readFileSync(path.join(dir, '.gitlab-ci.yml'), 'utf8');
    for (const line of ci.split('\n')) expect(after.split('\n')).toContain(line);
    expect(parse(after).include).toEqual([{ local: BELAY_CI }, { template: 'Jobs/SAST.gitlab-ci.yml' }]);
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toMatch(/^node_modules\/\n\n# Belay work folders.*\n\.belay-engine\//s);
    expect(fs.existsSync(path.join(dir, '.gitlab/duo/agent-config.yml'))).toBe(true);
    const again = run([dir, '--write']);
    expect(again.plan?.paired).toBe(true);
    expect(again.out).toMatch(/already paired/);
  });

  it('refuses what is not the root of a git checkout, or has no group', () => {
    const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-plain-'));
    expect(run([plain]).err).toMatch(/not the root of a git checkout/);
    const sub = repo({ 'app/x.txt': '' });
    expect(run([path.join(sub, 'app')]).code).toBe(2);
    expect(run([repo({}, '')]).err).toMatch(/no group/);
    expect(run([repo({}, ''), '--group', 'acme-lab']).code).toBe(0);
  });

  it('keeps an existing, different Belay file and agent config as they are, and says so (exit 1)', () => {
    const dir = repo({ [BELAY_CI]: 'include: []\n', '.gitlab/duo/agent-config.yml': 'image: ours\n' });
    const r = run([dir, '--write']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/refuse .*exists and differs/);
    expect(fs.readFileSync(path.join(dir, BELAY_CI), 'utf8')).toBe('include: []\n');
    expect(fs.readFileSync(path.join(dir, '.gitlab/duo/agent-config.yml'), 'utf8')).toBe('image: ours\n');
  });
});

describe('wiring .gitlab-ci.yml', () => {
  it('creates, appends, inserts under a block include, and keeps an already wired file', () => {
    expect(wireCi(null)).toEqual({ op: 'create', text: `include:\n  - local: ${BELAY_CI}\n` });
    expect(wireCi('a:\n  script: [x]')).toMatchObject({ op: 'append' });
    expect(wireCi('include:\n- template: A.yml\n')).toEqual({ op: 'insert', text: `include:\n- local: ${BELAY_CI}\n- template: A.yml\n` });
    expect(wireCi(`include:\n  - local: ${BELAY_CI}\n`)).toEqual({ op: 'keep' });
  });
  it('refuses a flow-style or single include, and a file that does not parse', () => {
    expect(wireCi('include: [{ template: A.yml }]\n')).toMatchObject({ op: 'refuse' });
    expect(wireCi("include: 'ci/a.yml'\n")).toMatchObject({ op: 'refuse' });
    expect(wireCi('a: [\n')).toMatchObject({ op: 'refuse' });
  });
  it('finds the group from https and ssh remotes', () => {
    expect(rootNamespace('https://gitlab.com/acme-lab/core-banking/ledgerline.git')).toBe('acme-lab');
    expect(rootNamespace('git@gitlab.example.com:acme-lab/x.git')).toBe('acme-lab');
    expect(rootNamespace('nonsense')).toBeNull();
  });
  it('the plan only ever adds lines to files that exist', () => {
    const files: Record<string, string> = { '.gitlab-ci.yml': 'include:\n  - template: A.yml\nb:\n  script: [y]\n', '.gitignore': '.env\n' };
    const p = planPair((f) => files[f] ?? null, REF, 'image: x\n');
    for (const a of p.actions.filter((x) => x.text !== undefined && files[x.path] !== undefined)) {
      for (const l of files[a.path]!.split('\n')) expect(a.text!.split('\n')).toContain(l);
    }
  });
});
