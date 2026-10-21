// A temp fleet for the cycle tests: one git repo whose gate is red while red.flag exists, with an existing test file
// (existing.test.mjs) and the files the frontier metrics read, plus helpers to run one wave against the fake claude.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { RunEvent } from '../../../src/schemas/run';
import { runWaves, type RunOptions } from '../../index';

export const FAKE = path.resolve(import.meta.dirname, '..', 'fakeClaude.mjs');
export const sh = (cwd: string, ...a: string[]): string => spawnSync('git', a, { cwd, encoding: 'utf8' }).stdout.trim();

export interface TempFleet {
  tmp: string;
  repoDir: string;
  runsDir: string;
  fleet: string;
}

/** A repo (and fleet file naming it `temp`) with extra fleet yaml lines for the repo entry. */
export function makeFleet(prefix: string, extraYaml = ''): TempFleet {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const repoDir = path.join(tmp, 'repo');
  fs.mkdirSync(repoDir);
  const w = (f: string, body: string) => fs.writeFileSync(path.join(repoDir, f), body);
  w('gate.mjs', "import fs from 'node:fs'; if (fs.existsSync('red.flag')) { console.error('FAIL red.flag is present'); process.exit(1); }\n");
  w('existing.test.mjs', "import assert from 'node:assert';\nconst add = (a, b) => a + b;\nassert.equal(add(1, 2), 3);\n");
  w('size.txt', '100\n');
  w('size.mjs', "import fs from 'node:fs'; console.log(`size=${fs.readFileSync('size.txt', 'utf8').trim()}`);\n");
  w('stats.json', '[{"bytes":10},{"bytes":20}]\n');
  // setup.ran stands in for node_modules: what a setup writes is ignored, never part of a lane's change.
  w('.gitignore', '.claude/worktrees/\nsetup.ran\n');
  sh(repoDir, 'init', '-q', '-b', 'main');
  sh(repoDir, 'config', 'user.email', 't@example.com');
  sh(repoDir, 'config', 'user.name', 'T');
  sh(repoDir, 'add', '-A');
  sh(repoDir, 'commit', '-q', '-m', 'init');
  const fleet = path.join(tmp, 'fleet.yml');
  fs.writeFileSync(fleet, `repos:\n  - slug: temp\n    path: ${JSON.stringify(repoDir)}\n    base: main\n    gates: [node gate.mjs]\n${extraYaml}`);
  return { tmp, repoDir, runsDir: path.join(tmp, 'runs'), fleet };
}

export interface Wave {
  code: number;
  lines: RunEvent[];
  ends: Record<string, Extract<RunEvent, { kind: 'lane.end' }>>;
  wave: number;
  calls: { step: string; lane: string; argv: string[]; settings: { permissions: { allow: string[] } } | null; prompt: string }[];
}

/** One wave on the temp repo; FAKE_CALLS is recorded for this wave only. */
export async function runOne(f: TempFleet, plan: string[], over: Partial<RunOptions> = {}): Promise<Wave> {
  process.env.FAKE_PLAN = JSON.stringify(plan.map((lane) => ({ lane, title: `do ${lane}` })));
  const callsFile = path.join(f.tmp, `calls-${Date.now()}.jsonl`);
  process.env.FAKE_CALLS = callsFile;
  const seen: RunEvent[] = [];
  try {
    const code = await runWaves({ repo: 'temp', waves: 1, lanes: 6, laneCapUsd: 3, waveCapUsd: 25, model: 'sonnet', fleet: f.fleet, runsDir: f.runsDir, ...over }, (e) => seen.push(e));
    const wave = seen[0]?.wave ?? 0;
    const lines = fs.readFileSync(path.join(f.runsDir, 'temp', `${wave}.jsonl`), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as RunEvent);
    const ends = Object.fromEntries(lines.filter((e) => e.kind === 'lane.end').map((e) => [e.lane, e])) as Wave['ends'];
    const calls = fs.existsSync(callsFile) ? fs.readFileSync(callsFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Wave['calls'][number]) : [];
    return { code, lines, ends, wave, calls };
  } finally {
    delete process.env.FAKE_CALLS;
  }
}
