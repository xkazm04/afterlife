// runWaves end to end against a FAKE claude (fakeClaude.mjs) and a temp git repo whose gate is red
// whenever red.flag exists in the worktree. Real git, real worktrees, real process spawns.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RUN_SCHEMA, type RunEvent } from '../../src/schemas/run';
import { runWaves, type RunOptions } from '../index';

const FAKE = path.resolve(import.meta.dirname, 'fakeClaude.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-run-'));
const repoDir = path.join(tmp, 'repo');
const runsDir = path.join(tmp, 'runs');
const fleet = path.join(tmp, 'fleet.yml');
const sh = (cwd: string, ...a: string[]) => spawnSync('git', a, { cwd, encoding: 'utf8' }).stdout.trim();

beforeAll(() => {
  fs.mkdirSync(repoDir);
  fs.writeFileSync(path.join(repoDir, 'gate.mjs'), "import fs from 'node:fs'; if (fs.existsSync('red.flag')) { console.log('checking'); console.error('\\x1b[31mFAIL\\x1b[0m red.flag is present'); process.exit(1); }\n");
  fs.writeFileSync(path.join(repoDir, '.gitignore'), '.claude/worktrees/\n');
  sh(repoDir, 'init', '-q', '-b', 'main');
  sh(repoDir, 'config', 'user.email', 't@example.com');
  sh(repoDir, 'config', 'user.name', 'T');
  sh(repoDir, 'add', '-A');
  sh(repoDir, 'commit', '-q', '-m', 'init');
  fs.writeFileSync(fleet, `repos:\n  - slug: temp\n    path: ${JSON.stringify(repoDir)}\n    base: main\n    gates: [node gate.mjs]\n`);
  process.env.BELAY_CLAUDE_BIN = FAKE;
});
afterAll(() => {
  delete process.env.BELAY_CLAUDE_BIN;
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function run(plan: string[], over: Partial<RunOptions> = {}) {
  process.env.FAKE_PLAN = JSON.stringify(plan.map((lane) => ({ lane, title: `do ${lane}` })));
  const seen: RunEvent[] = [];
  const code = await runWaves({ repo: 'temp', waves: 1, lanes: 6, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet', fleet, runsDir, ...over }, (e) => seen.push(e));
  const wave = seen[0]?.wave ?? 0;
  const file = path.join(runsDir, 'temp', `${wave}.jsonl`);
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as RunEvent);
  const ends = Object.fromEntries(lines.filter((e) => e.kind === 'lane.end').map((e) => [e.lane, e]));
  return { code, seen, lines, ends, wave, file };
}

describe('runWaves with a fake claude', () => {
  it('lands a green lane, fails a red one without a commit, parks a PARK, and writes a valid belay.run/0 file', async () => {
    const mainBefore = sh(repoDir, 'rev-parse', 'main');
    const r = await run(['ok-a', 'red-b', 'park-c']);
    expect(r.code).toBe(0);
    expect(new Set(r.lines.map((e) => e.kind))).toEqual(new Set(['wave.start', 'lane.start', 'lane.usage', 'lane.end', 'wave.end']));
    for (const e of r.lines) {
      expect(e.v).toBe(RUN_SCHEMA);
      expect(e.repo).toBe('temp');
      expect(e.promptVersion).toMatch(/^[0-9a-f]{12}$/);
      expect(Date.parse(e.ts)).not.toBeNaN();
    }
    expect(r.ends['ok-a']).toMatchObject({ outcome: 'landed' });
    expect(r.ends['ok-a']?.kind === 'lane.end' && r.ends['ok-a'].commits).toHaveLength(1);
    expect(r.ends['red-b']).toMatchObject({ outcome: 'failed', parkReason: 'gate red: node gate.mjs (exit 1)\nchecking\nFAIL red.flag is present' });
    expect(r.ends['red-b']?.kind === 'lane.end' && r.ends['red-b'].commits).toEqual([]);
    expect(r.ends['park-c']).toMatchObject({ outcome: 'parked', parkReason: expect.stringContaining('gate-surface') });
    const end = r.lines.find((e) => e.kind === 'wave.end');
    expect(end).toMatchObject({ branch: `belay/wave-${r.wave}`, mergeable: true });
    // The wave branch holds exactly the landed commit; red.flag never reached it; main did not move.
    const log = sh(repoDir, 'log', '--format=%s', `main..belay/wave-${r.wave}`);
    expect(log).toBe(`belay(wave-${r.wave}): do ok-a`);
    expect(sh(repoDir, 'ls-tree', '-r', '--name-only', `belay/wave-${r.wave}`)).not.toContain('red.flag');
    expect(sh(repoDir, 'rev-parse', 'main')).toBe(mainBefore);
    expect(sh(repoDir, 'branch', '--list', 'belay/wave-*-*')).toBe('');
    expect(fs.readFileSync(r.file.replace('.jsonl', '.proposals.md'), 'utf8')).toContain('Nothing worth changing');
    expect(r.lines.some((e) => e.kind === 'lane.usage' && e.lane === 'reflect')).toBe(true);
  }, 90_000);

  it('halts a lane over its cap as budget and skips lanes once the wave cap is reached', async () => {
    const r = await run(['exp-a', 'ok-b', 'ok-c'], { laneCapUsd: 3, waveCapUsd: 5 });
    expect(r.ends['exp-a']).toMatchObject({ outcome: 'budget' });
    expect(r.ends['exp-a']?.kind === 'lane.end' && r.ends['exp-a'].commits).toEqual([]);
    // plan $0.25 + exp $9 >= $5: the other lanes never start, and the wave still ends.
    expect(r.lines.filter((e) => e.kind === 'lane.start')).toHaveLength(1);
    expect(r.lines.find((e) => e.kind === 'wave.end')).toMatchObject({ mergeable: false });
  }, 90_000);

  it('kills a hung lane at the timeout', async () => {
    const r = await run(['hang-a'], { laneTimeoutMs: 4000 });
    expect(r.ends['hang-a']).toMatchObject({ outcome: 'timeout' });
    expect(r.lines.some((e) => e.kind === 'lane.usage' && e.lane === 'hang-a')).toBe(false);
  }, 90_000);

  it('parks a green lane that edits agent or hook config, so a landed commit cannot arm later waves', async () => {
    const r = await run(['cfg-a', 'ok-b']);
    expect(r.ends['cfg-a']).toMatchObject({ outcome: 'parked', parkReason: expect.stringContaining('.claude/settings.json') });
    expect(r.ends['ok-b']).toMatchObject({ outcome: 'landed' });
    expect(sh(repoDir, 'ls-tree', '-r', '--name-only', `belay/wave-${r.wave}`)).not.toContain('.claude/settings.json');
  }, 90_000);
});
