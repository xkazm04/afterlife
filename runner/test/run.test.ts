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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-run-'));
const repoDir = path.join(tmp, 'repo');
/** A repo whose base is red on its own: red.flag is committed. */
const redDir = path.join(tmp, 'red');
const runsDir = path.join(tmp, 'runs');
const fleet = path.join(tmp, 'fleet.yml');
const sh = (cwd: string, ...a: string[]) => spawnSync('git', a, { cwd, encoding: 'utf8' }).stdout.trim();

function initRepo(repoDir: string, red: boolean) {
  fs.mkdirSync(repoDir);
  if (red) fs.writeFileSync(path.join(repoDir, 'red.flag'), 'x');
  fs.writeFileSync(path.join(repoDir, 'gate.mjs'), "import fs from 'node:fs'; if (fs.existsSync('red.flag')) { console.log('checking'); console.error('\\x1b[31mFAIL\\x1b[0m red.flag is present'); process.exit(1); }\n");
  fs.writeFileSync(path.join(repoDir, '.gitignore'), '.claude/worktrees/\n');
  sh(repoDir, 'init', '-q', '-b', 'main');
  sh(repoDir, 'config', 'user.email', 't@example.com');
  sh(repoDir, 'config', 'user.name', 'T');
  sh(repoDir, 'add', '-A');
  sh(repoDir, 'commit', '-q', '-m', 'init');
}

beforeAll(() => {
  initRepo(repoDir, false);
  initRepo(redDir, true);
  const entry = (slug: string, dir: string) => `  - slug: ${slug}\n    path: ${JSON.stringify(dir)}\n    base: main\n    gates: [node gate.mjs]\n`;
  fs.writeFileSync(fleet, `repos:\n${entry('temp', repoDir)}${entry('temp-red', redDir)}`);
  process.env.AFTERLIFE_CLAUDE_BIN = FAKE;
});
afterAll(() => {
  delete process.env.AFTERLIFE_CLAUDE_BIN;
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

async function run(plan: string[], over: Partial<RunOptions> = {}) {
  process.env.FAKE_PLAN = JSON.stringify(plan.map((lane) => ({ lane, title: `do ${lane}` })));
  const seen: RunEvent[] = [];
  const code = await runWaves({ repo: 'temp', waves: 1, lanes: 6, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet', fleet, runsDir, ...over }, (e) => seen.push(e));
  const wave = seen[0]?.wave ?? 0;
  const file = path.join(runsDir, over.repo ?? 'temp', `${wave}.jsonl`);
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as RunEvent);
  const ends = Object.fromEntries(lines.filter((e) => e.kind === 'lane.end').map((e) => [e.lane, e]));
  return { code, seen, lines, ends, wave, file };
}

describe('runWaves with a fake claude', () => {
  it('lands a green lane, fails a red one without a commit, parks a PARK, and writes a valid belay.run/0 file', async () => {
    const mainBefore = sh(repoDir, 'rev-parse', 'main');
    const r = await run(['ok-a', 'red-b', 'park-c']);
    expect(r.code).toBe(0);
    expect(new Set(r.lines.map((e) => e.kind))).toEqual(new Set(['wave.start', 'wave.plan', 'lane.start', 'lane.usage', 'lane.end', 'wave.end']));
    // The plan's answer is on record right after the planner's own usage: what it wrote, what parsed, which lanes.
    const planAt = r.lines.findIndex((e) => e.kind === 'wave.plan');
    expect(r.lines[planAt]).toMatchObject({ raw: 3, parsed: 3, items: ['ok-a', 'red-b', 'park-c'] });
    expect(r.lines[planAt]).not.toHaveProperty('voided');
    expect(r.lines[planAt - 1]).toMatchObject({ kind: 'lane.usage', lane: 'plan', sessionId: 'fake-plan-' });
    expect(r.lines.find((e) => e.kind === 'lane.usage' && e.lane === 'ok-a')).toMatchObject({ sessionId: 'fake-lane-ok-a' });
    for (const e of r.lines) {
      expect(e.v).toBe(RUN_SCHEMA);
      expect(e.repo).toBe('temp');
      expect(e.promptVersion).toMatch(/^[0-9a-f]{12}$/);
      expect(Date.parse(e.ts)).not.toBeNaN();
    }
    expect(r.ends['ok-a']).toMatchObject({ outcome: 'landed' });
    expect(r.ends['ok-a']?.kind === 'lane.end' && r.ends['ok-a'].commits).toHaveLength(1);
    expect(r.ends['red-b']).toMatchObject({ outcome: 'failed', parkReason: 'gate red: node gate.mjs (exit 1, 2 runs)\nchecking\nFAIL red.flag is present' });
    expect(r.ends['red-b']?.kind === 'lane.end' && r.ends['red-b'].commits).toEqual([]);
    expect(r.ends['park-c']).toMatchObject({ outcome: 'parked', parkReason: expect.stringContaining('gate-surface') });
    // The red gate's whole output is kept beside the run file, not only the tail in parkReason.
    const gateLog = `temp/${r.wave}.red-b.gate.log`;
    expect(r.ends['red-b']).toMatchObject({ gateLog });
    expect(fs.readFileSync(path.join(runsDir, gateLog), 'utf8')).toContain('FAIL red.flag is present');
    // The red lane's work survives its worktree as a patch that applies to base; a lane that changed nothing has none.
    const patch = `temp/${r.wave}.red-b.patch`;
    expect(r.ends['red-b']).toMatchObject({ patch });
    const body = fs.readFileSync(path.join(runsDir, patch), 'utf8');
    expect(body).toContain('red-b.txt');
    expect(body).toContain('red.flag');
    expect(spawnSync('git', ['apply', '--check', path.join(runsDir, patch)], { cwd: repoDir }).status).toBe(0);
    expect(r.ends['park-c']).not.toHaveProperty('patch');
    expect(r.ends['ok-a']).not.toHaveProperty('patch');
    const end = r.lines.find((e) => e.kind === 'wave.end');
    expect(end).toMatchObject({ branch: `belay/wave-${r.wave}`, mergeable: true, branchKept: true });
    expect(end).not.toHaveProperty('baseRed');
    // The wave branch holds exactly the landed commit; red.flag never reached it; main did not move.
    const log = sh(repoDir, 'log', '--format=%s', `main..belay/wave-${r.wave}`);
    expect(log).toBe(`belay(wave-${r.wave}): do ok-a`);
    expect(sh(repoDir, 'ls-tree', '-r', '--name-only', `belay/wave-${r.wave}`)).not.toContain('red.flag');
    expect(sh(repoDir, 'rev-parse', 'main')).toBe(mainBefore);
    expect(sh(repoDir, 'branch', '--list', 'belay/wave-*-*')).toBe('');
    expect(fs.readFileSync(r.file.replace('.jsonl', '.proposals.md'), 'utf8')).toContain('Nothing worth changing');
    expect(r.lines.some((e) => e.kind === 'lane.usage' && e.lane === 'reflect')).toBe(true);
  }, 90_000);

  it('ends a wave before the plan when base is red on its own, and runs it with skipBaseGates', async () => {
    const r = await run(['ok-a'], { repo: 'temp-red' });
    expect(r.code).toBe(1);
    expect(r.lines.map((e) => e.kind)).toEqual(['wave.start', 'wave.end']);
    expect(r.lines[1]).toMatchObject({ mergeable: false, costUsd: 0, branchKept: false, baseRed: 'base gate red: node gate.mjs (exit 1, 2 runs)\nchecking\nFAIL red.flag is present' });
    expect(fs.existsSync(r.file.replace('.jsonl', '.proposals.md'))).toBe(false);
    expect(sh(redDir, 'branch', '--list', 'belay/*')).toBe('');
    const s = await run(['park-a'], { repo: 'temp-red', skipBaseGates: true });
    expect(s.code).toBe(0);
    expect(s.lines.find((e) => e.kind === 'wave.plan')).toMatchObject({ parsed: 1 });
    expect(s.lines.find((e) => e.kind === 'wave.end')).not.toHaveProperty('baseRed');
  }, 90_000);

  it('stacks each lane on the wave tip, so two lanes editing one shared file both land', async () => {
    const r = await run(['wire-a', 'wire-b']);
    expect(r.ends['wire-a']).toMatchObject({ outcome: 'landed' });
    expect(r.ends['wire-b']).toMatchObject({ outcome: 'landed' });
    expect(sh(repoDir, 'show', `belay/wave-${r.wave}:wiring.txt`).split(/\r?\n/)).toEqual(['wire-a', 'wire-b']);
  }, 90_000);

  it('records a plan that wrote more lines than run, and runs only the asked-for count', async () => {
    const r = await run(['park-x', 'park-y'], { lanes: 1 });
    expect(r.lines.find((e) => e.kind === 'wave.plan')).toMatchObject({ raw: 2, parsed: 1, items: ['park-x'] });
    expect(r.lines.filter((e) => e.kind === 'lane.start')).toHaveLength(1);
  }, 90_000);

  it('halts a lane over its cap as budget and skips lanes once the wave cap is reached', async () => {
    const r = await run(['exp-a', 'ok-b', 'ok-c'], { laneCapUsd: 3, waveCapUsd: 5 });
    expect(r.ends['exp-a']).toMatchObject({ outcome: 'budget' });
    expect(r.ends['exp-a']?.kind === 'lane.end' && r.ends['exp-a'].commits).toEqual([]);
    // plan $0.25 + exp $9 >= $5: the other lanes never start, and the wave still ends.
    expect(r.lines.filter((e) => e.kind === 'lane.start')).toHaveLength(1);
    // Nothing landed: the branch the event names was deleted, and the event says so.
    expect(r.lines.find((e) => e.kind === 'wave.end')).toMatchObject({ mergeable: false, branchKept: false });
    expect(sh(repoDir, 'branch', '--list', `belay/wave-${r.wave}`)).toBe('');
  }, 90_000);

  it('caps a lane at what the wave has left, so the last lane cannot carry the wave past its cap', async () => {
    // plan $0.25 leaves $0.35 of a $0.60 wave; ok-a then spends $0.50: over what was left, so budget, not landed.
    const r = await run(['ok-a'], { laneCapUsd: 3, waveCapUsd: 0.6 });
    expect(r.ends['ok-a']).toMatchObject({ outcome: 'budget', parkReason: expect.stringContaining('$0.35 cap') });
    expect(r.ends['ok-a']?.kind === 'lane.end' && r.ends['ok-a'].commits).toEqual([]);
  }, 90_000);

  it('a wave head a stopped run left registered does not block the next run', async () => {
    sh(repoDir, 'worktree', 'add', '-q', '-b', 'belay/wave-90', path.join(repoDir, '.claude', 'worktrees', 'afterlife-wave-head'), 'main');
    const r = await run(['ok-a']);
    expect(r.ends['ok-a']).toMatchObject({ outcome: 'landed' });
    sh(repoDir, 'branch', '-D', 'belay/wave-90');
  }, 90_000);

  it('kills a hung lane at the timeout', async () => {
    const r = await run(['hang-a'], { laneTimeoutMs: 4000 });
    expect(r.ends['hang-a']).toMatchObject({ outcome: 'timeout' });
    expect(r.lines.some((e) => e.kind === 'lane.usage' && e.lane === 'hang-a')).toBe(false);
  }, 90_000);

  it('parks a green lane that edits agent or hook config, so a landed commit cannot arm later waves', async () => {
    const r = await run(['cfg-a', 'ok-b']);
    expect(r.ends['cfg-a']).toMatchObject({ outcome: 'parked', parkReason: expect.stringContaining('.claude/settings.json') });
    // Refused before the review turn, which would have run in a worktree whose project settings the lane wrote.
    expect(r.lines.filter((e) => e.kind === 'lane.usage' && e.lane === 'cfg-a').map((e) => (e.kind === 'lane.usage' ? e.call ?? 'lane' : ''))).toEqual(['lane']);
    expect(r.ends['ok-b']).toMatchObject({ outcome: 'landed' });
    expect(sh(repoDir, 'ls-tree', '-r', '--name-only', `belay/wave-${r.wave}`)).not.toContain('.claude/settings.json');
  }, 90_000);
});
