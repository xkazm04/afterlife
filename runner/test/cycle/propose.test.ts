// --mode propose, --onto and --base against the fake claude and a temp repo: a propose wave is wave.start, the plan and
// wave.end with no lane, branch or reflect, and the next wave's planner sees what it proposed; --onto lands on an
// existing branch and never deletes it; --onto is refused (exit 2, no run file) when it may not be used.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { refRefusal } from '../../wave/runWaves';
import { FAKE, makeFleet, runOne, sh, type TempFleet } from './repo';

let f: TempFleet;
beforeAll(() => {
  f = makeFleet('belay-propose-');
  process.env.BELAY_CLAUDE_BIN = FAKE;
});
afterAll(() => {
  delete process.env.BELAY_CLAUDE_BIN;
  fs.rmSync(f.tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const worktrees = (): string[] => sh(f.repoDir, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree '));

describe('a propose-only wave', () => {
  it('runs only the plan, records it as the proposal, and the next wave is told what was proposed', async () => {
    const first = await runOne(f, ['ok-a', 'red-b'], { mode: 'propose' });
    expect(first.code).toBe(0);
    expect(first.lines.map((e) => e.kind)).toEqual(['wave.start', 'lane.usage', 'wave.plan', 'wave.end']);
    expect(first.lines[0]).toMatchObject({ kind: 'wave.start', mode: 'propose', branch: `belay/wave-${first.wave}` });
    expect(first.lines[0]).not.toHaveProperty('onto');
    expect(first.lines[2]).toMatchObject({ kind: 'wave.plan', parsed: 2, items: ['ok-a', 'red-b'] });
    expect(first.lines[2]).not.toHaveProperty('ideas');
    expect(first.lines[3]).toMatchObject({ kind: 'wave.end', landed: 0, mergeable: false, branchKept: false, proposeOnly: true, costUsd: 0.25 });
    // Only the planner was called: no lane, review or reflect; no branch was made and no worktree is left.
    expect(first.calls.map((c) => c.step)).toEqual(['plan']);
    expect(first.calls[0]?.prompt).toContain('## Propose-only wave');
    expect(sh(f.repoDir, 'branch', '--list', 'belay/*')).toBe('');
    expect(worktrees()).toHaveLength(1);
    expect(fs.existsSync(path.join(f.runsDir, 'temp', `${first.wave}.proposals.md`))).toBe(false);
    const proposed = fs.readFileSync(path.join(f.runsDir, 'temp', `${first.wave}.proposed.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { lane: string; title: string });
    expect(proposed.map((p) => p.title)).toEqual(['do ok-a', 'do red-b']);

    const second = await runOne(f, ['ok-c'], { mode: 'propose' });
    expect(second.wave).toBe(first.wave + 1);
    expect(second.calls[0]?.prompt).toContain(`wave ${first.wave}: do ok-a -> proposed by a propose-only wave, not run yet`);
  }, 90_000);
});

describe('--onto an existing branch', () => {
  it('lands on it from its tip, keeps it when nothing lands, and makes no belay/wave branch', async () => {
    sh(f.repoDir, 'branch', 'work');
    const before = sh(f.repoDir, 'rev-parse', 'work');
    const r = await runOne(f, ['ok-a'], { onto: 'work' });
    expect(r.code).toBe(0);
    expect(r.lines[0]).toMatchObject({ kind: 'wave.start', base: 'work', branch: 'work', onto: true });
    expect(r.ends['ok-a']).toMatchObject({ outcome: 'landed' });
    expect(r.lines.find((e) => e.kind === 'wave.end')).toMatchObject({ kind: 'wave.end', branch: 'work', branchKept: true, landed: 1, mergeable: true });
    expect(sh(f.repoDir, 'rev-parse', 'work^')).toBe(before);
    expect(sh(f.repoDir, 'branch', '--list', 'belay/*')).toBe('');

    const tip = sh(f.repoDir, 'rev-parse', 'work');
    const parked = await runOne(f, ['park-c'], { onto: 'work' });
    expect(parked.lines.find((e) => e.kind === 'wave.end')).toMatchObject({ kind: 'wave.end', branch: 'work', branchKept: true, landed: 0 });
    expect(sh(f.repoDir, 'rev-parse', 'work')).toBe(tip);
    expect(worktrees()).toHaveLength(1);
  }, 120_000);

  it('is refused before anything runs: missing, checked out (naming where), or with --base', async () => {
    expect(await refRefusal(f.repoDir, { onto: 'nope' })).toContain('no such local branch');
    expect(await refRefusal(f.repoDir, { onto: 'main' })).toContain(`checked out at ${sh(f.repoDir, 'rev-parse', '--show-toplevel')}`);
    expect(await refRefusal(f.repoDir, { onto: 'work', base: 'main' })).toContain('cannot be combined');
    expect(await refRefusal(f.repoDir, { onto: '-x' })).toContain('not a branch name');
    expect(await refRefusal(f.repoDir, { base: '--upload-pack=x' })).toContain('not a git ref');
    expect(await refRefusal(f.repoDir, { onto: 'work' })).toBeNull();
    const files = fs.readdirSync(path.join(f.runsDir, 'temp')).length;
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { runWaves } = await import('../../index');
      const code = await runWaves({ repo: 'temp', waves: 1, lanes: 1, laneCapUsd: 1, waveCapUsd: 1, model: 'sonnet', fleet: f.fleet, runsDir: f.runsDir, onto: 'main' }, () => undefined);
      expect(code).toBe(2);
      expect(err).toHaveBeenCalledWith(expect.stringContaining('--onto main: the branch is checked out at'));
    } finally {
      err.mockRestore();
    }
    expect(fs.readdirSync(path.join(f.runsDir, 'temp'))).toHaveLength(files);
  }, 60_000);
});

describe('--base', () => {
  it('starts the first wave branch from the given ref instead of the fleet base', async () => {
    sh(f.repoDir, 'switch', '-q', '-c', 'alt');
    fs.writeFileSync(path.join(f.repoDir, 'alt.txt'), 'alt\n');
    sh(f.repoDir, 'add', 'alt.txt');
    sh(f.repoDir, 'commit', '-q', '-m', 'alt');
    sh(f.repoDir, 'switch', '-q', 'main');
    const r = await runOne(f, ['ok-a'], { base: 'alt' });
    expect(r.lines[0]).toMatchObject({ kind: 'wave.start', base: 'alt', branch: `belay/wave-${r.wave}` });
    expect(r.ends['ok-a']).toMatchObject({ outcome: 'landed' });
    expect(sh(f.repoDir, 'rev-parse', `belay/wave-${r.wave}^`)).toBe(sh(f.repoDir, 'rev-parse', 'alt'));
  }, 90_000);
});
