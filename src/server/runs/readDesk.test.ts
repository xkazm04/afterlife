import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WAVE_1 } from '@/lib/runs/fixture';
import { BRANCH_TTL_MS, branchState } from './branchState';
import { readDesk, readDeskAndRuns } from './readDesk';
import { readFleet } from './readFleet';

const roots: string[] = [];
const temp = (p: string) => {
  const d = mkdtempSync(join(tmpdir(), p));
  roots.push(d);
  return d;
};
afterEach(() => roots.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })));

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
    writeFileSync(join(root, 'fleet.yml'), 'repos:\n  - {slug: a, path: /x, base: main}\n  - {slug: a, path: /y, base: main}\n');
    expect(readFleet(root)).toEqual({ file: 'invalid', refs: [], error: 'repos[1]: duplicate slug "a"' });
    // the runner's slug and base rule (runner/fleet/names.ts): a file it refuses is not ok on the screens either
    writeFileSync(join(root, 'fleet.yml'), 'repos:\n  - {slug: Core API, path: /x, base: main}\n');
    expect(readFleet(root)).toEqual({ file: 'invalid', refs: [], error: 'repos[0]: slug must be a lowercase token' });
    writeFileSync(join(root, 'fleet.yml'), "repos:\n  - {slug: a, path: /x, base: '--upload-pack=x'}\n");
    expect(readFleet(root)).toEqual({ file: 'invalid', refs: [], error: 'repos[0]: base must be a git ref or sha' });
    writeFileSync(join(root, 'fleet.yml'), 'repos: [\n');
    expect(readFleet(root)).toMatchObject({ file: 'invalid', refs: [] });
    writeFileSync(join(root, 'fleet.yml'), 'other: 1\n');
    expect(readFleet(root)).toEqual({ file: 'invalid', refs: [], error: 'no "repos" list' });
  });
});

describe('branchState', () => {
  it('reads exists and merged from git, and says nothing for a base that does not resolve', async () => {
    const r = repoWithWave();
    expect(await branchState(r, 'belay/wave-1', 'main')).toEqual({ exists: true, merged: false });
    expect(await branchState(r, 'belay/wave-9', 'main')).toEqual({ exists: false, merged: false });
    expect(await branchState(r, 'belay/wave-1', 'no-such-base')).toBeUndefined();
    git(r, 'merge', '-q', '--ff-only', 'belay/wave-1');
    // the answer is kept for BRANCH_TTL_MS, then read again
    expect(await branchState(r, 'belay/wave-1', 'main')).toEqual({ exists: true, merged: false });
    expect(await branchState(r, 'belay/wave-1', 'main', Date.now() + BRANCH_TTL_MS)).toEqual({ exists: true, merged: true });
  });

  it('a second ask within the window shares the first read', () => {
    const r = repoWithWave();
    const first = branchState(r, 'belay/wave-1', 'main');
    expect(branchState(r, 'belay/wave-1', 'main')).toBe(first);
    expect(branchState(r, 'belay/wave-1', 'main', Date.now() + BRANCH_TTL_MS)).not.toBe(first);
  });
});

describe('readDesk', () => {
  it('asks git once per mergeable wave of repos the fleet file names, and folds the runs it read', async () => {
    const r = repoWithWave();
    const root = temp('belay-desk-');
    mkdirSync(join(root, 'runs', 'alpha'), { recursive: true });
    writeFileSync(join(root, 'runs', 'alpha', '1.jsonl'), WAVE_1.join('\n'));
    writeFileSync(join(root, 'fleet.yml'), `repos:\n  - {slug: alpha, path: '${r.replace(/\\/g, '/')}', base: main, gates: [t]}\n`);
    const asked: string[] = [];
    const { desk: d, runs } = await readDeskAndRuns(root, (p, b, base) => (asked.push(b), branchState(p, b, base)));
    expect(asked).toEqual(['belay/wave-1']);
    expect(runs.repos.map((x) => x.repo)).toEqual(['alpha']);
    expect(d.needs.map((n) => n.kind)).toEqual(['merge-wave', 'parked-lane']);
    expect(d.rows[0]).toMatchObject({ slug: 'alpha', inFleet: true, waves: 1, needs: 2, last: { wave: 1, merged: false } });
    expect(await readDesk(root, () => Promise.resolve({ exists: true, merged: true }))).toMatchObject({ rows: [{ last: { merged: true } }] });
  });
});
