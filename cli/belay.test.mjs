// The CLI's contract today: no verb or `help` prints usage and exits 0; an unknown verb and the unbuilt ones exit 2 (never a
// silent 0).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const bin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'belay.mjs');
const belay = (...args) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-cli-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

describe('cli/belay.mjs', () => {
  it('prints usage and exits 0 for no verb and for help', () => {
    for (const args of [[], ['help'], ['--help']]) {
      const r = belay(...args);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('usage: belay doctor');
    }
  });

  it('names every flag that run and pair print in their own usage (the verbs are the ground truth, not this list)', () => {
    const help = belay('help').stdout;
    for (const verb of ['run', 'pair']) {
      const own = belay(verb).stderr.match(/usage: belay (.+)/)?.[1]?.trim();
      expect(own, `belay ${verb} printed no usage`).toBeTruthy();
      for (const flag of own.match(/--[a-z-]+/g)) expect(help, `${verb} ${flag}`).toContain(flag);
    }
  }, 120_000);

  it('refuses an unknown verb with exit 2 on stderr, as engine/cli.ts does, so a typo in a script is not a pass', () => {
    const r = belay('doctr');
    expect(r.status).toBe(2);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('belay: unknown command "doctr"');
    expect(r.stderr).toContain('usage: belay doctor');
  });

  it('run needs --repo, and --dry-run prints repo, base, caps and model without spawning anything', () => {
    const bad = belay('run');
    expect(bad.status).toBe(2);
    expect(bad.stderr).toContain('usage: belay run --repo');
    const dir = fs.mkdtempSync(path.join(tmp, 'run-'));
    const fleet = path.join(dir, 'fleet.yml');
    fs.writeFileSync(fleet, 'repos:\n  - slug: demo\n    path: /nowhere\n    base: main\n    laneCapUsd: 2\n    gates: [npm test]\n');
    const r = belay('run', '--repo', 'demo', '--fleet', fleet, '--wave-cap', '9', '--model', 'opus', '--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('repo   demo');
    expect(r.stdout).toContain('base   main');
    expect(r.stdout).toContain('lane $2, wave $9');
    expect(r.stdout).toContain('model  opus');
    expect(r.stdout).toContain('dry run: nothing was spawned');
    expect(belay('run', '--repo', 'ghost', '--fleet', fleet, '--dry-run').status).toBe(2);
    // A relative --fleet is the caller's file, although run executes from the app root.
    const rel = spawnSync(process.execPath, [bin, 'run', '--repo', 'demo', '--fleet', 'fleet.yml', '--dry-run'], { cwd: dir, encoding: 'utf8' });
    expect(rel.status, rel.stderr).toBe(0);
    expect(rel.stdout).toContain('repo   demo');
  }, 240_000);

  it('scan reads a checkout given as a positional or as --dir, the form engine/commands/scan.ts documents', () => {
    const dir = fs.mkdtempSync(path.join(tmp, 'scan-'));
    const positional = belay('scan', dir);
    expect(positional.status, positional.stderr).toBe(0);
    for (const args of [['--dir', dir], ['--dir', dir, '--propose'], [dir, '--propose']]) {
      const r = belay('scan', ...args);
      expect(r.stderr).not.toContain('needs a value');
      expect(r.status, `${args.join(' ')}: ${r.stderr}`).toBe(0);
    }
  }, 120_000);

  it.each(['replay'])('%s is not implemented and exits 2', (verb) => {
    const r = belay(verb);
    expect(r.status).toBe(2);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain(`belay ${verb}: not implemented yet`);
  });
});
