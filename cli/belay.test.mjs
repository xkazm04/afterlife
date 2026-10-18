// The CLI's contract today: `help`/unknown prints usage and exits 0; the unbuilt verbs say so and exit 2 (never a silent 0).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const bin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'belay.mjs');
const belay = (...args) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });

describe('cli/belay.mjs', () => {
  it('prints usage and exits 0 for no verb and for an unknown one', () => {
    for (const args of [[], ['nonsense']]) {
      const r = belay(...args);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('usage: belay doctor');
    }
  });

  it('run needs --repo, and --dry-run prints repo, base, caps and model without spawning anything', () => {
    const bad = belay('run');
    expect(bad.status).toBe(2);
    expect(bad.stderr).toContain('usage: belay run --repo');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-cli-'));
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
  }, 240_000);

  it.each(['pair', 'scan', 'replay'])('%s is not implemented and exits 2', (verb) => {
    const r = belay(verb);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain(`belay ${verb}: not implemented yet`);
  });
});
