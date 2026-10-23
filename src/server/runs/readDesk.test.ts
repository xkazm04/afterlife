import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WAVE_1 } from '@/lib/runs/fixture';
import { branchState } from './branchState';
import { readDesk } from './readDesk';
import { readFleet } from './readFleet';

const roots: string[] = [];
const temp = (p: string) => {
  const d = mkdtempSync(join(tmpdir(), p));
  roots.push(d);
  return d;
};
afterEach(() => roots.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'ignore' });

function repoWithWave(): string {
  const r = temp('belay-git-');
  git(r, 'init', '-q', '-b', 'main');
  writeFileSync(join(r, 'a.txt'), 'a\n');
  git(r, 'add', '.');
  git(r, 'commit', '-q', '-m', 'base');
  git(r, 'branch', 'belay/wave-1');
  git(r, 'switch', '-q', 'belay/wave-1');
  writeFileSync(join(r, 'a.txt'), 'b\n');
  git(r, 'commit', '-q', '-am', 'lane a');
  git(r, 'switch', '-q', 'main');
  return r;
}

describe('readFleet', () => {
  it('missing, invalid with its reason, or the repos', () => {
    const root = temp('belay-fleet-');
    expect(readFleet(root)).toEqual({ file: 'missing', refs: [] });
    writeFileSync(join(root, 'fleet.yml'), 'repos:\n  - {slug: a, path: /x}\n');
    expect(readFleet(root)).toEqual({ file: 'invalid', refs: [], error: 'repos[0] needs slug, path and base' });
    writeFileSync(join(root, 'fleet.yml'), 'repos:\n  - {slug: a, path: /x, base: main, gates: [t]}\n');
    expect(readFleet(root)).toEqual({ file: 'ok', refs: [{ slug: 'a', path: '/x', base: 'main' }] });
    writeFileSync(join(root, 'fleet.yml'), 'repos:\n  - {slug: a, path: /x, base: main, gitlab: acme/core/a}\n');
    expect(readFleet(root).refs).toEqual([{ slug: 'a', path: '/x', base: 'main', gitlab: 'acme/core/a' }]);
  });
});

describe('branchState', () => {
  it('reads exists and merged from git, and says nothing for a base that does not resolve', () => {
    const r = repoWithWave();
    expect(branchState(r, 'belay/wave-1', 'main')).toEqual({ exists: true, merged: false });
    expect(branchState(r, 'belay/wave-9', 'main')).toEqual({ exists: false, merged: false });
    expect(branchState(r, 'belay/wave-1', 'no-such-base')).toBeUndefined();
    git(r, 'merge', '-q', '--ff-only', 'belay/wave-1');
    expect(branchState(r, 'belay/wave-1', 'main')).toEqual({ exists: true, merged: true });
  });
});

describe('readDesk', () => {
  it('asks git only for the mergeable waves of repos the fleet file names', () => {
    const r = repoWithWave();
    const root = temp('belay-desk-');
    mkdirSync(join(root, 'runs', 'alpha'), { recursive: true });
    writeFileSync(join(root, 'runs', 'alpha', '1.jsonl'), WAVE_1.join('\n'));
    writeFileSync(join(root, 'fleet.yml'), `repos:\n  - {slug: alpha, path: '${r.replace(/\\/g, '/')}', base: main, gates: [t]}\n`);
    const asked: string[] = [];
    const d = readDesk(root, (p, b, base) => (asked.push(b), branchState(p, b, base)));
    expect(asked).toEqual(['belay/wave-1']);
    expect(d.needs.map((n) => n.kind)).toEqual(['merge-wave', 'parked-lane']);
    expect(d.rows[0]).toMatchObject({ slug: 'alpha', inFleet: true, waves: 1, needs: 2, last: { wave: 1, merged: false } });
  });
});
