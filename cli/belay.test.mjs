// The CLI's contract today: `help`/unknown prints usage and exits 0; the unbuilt verbs say so and exit 2 (never a silent 0).
import { spawnSync } from 'node:child_process';
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

  it.each(['pair', 'scan', 'replay'])('%s is not implemented and exits 2', (verb) => {
    const r = belay(verb);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain(`belay ${verb}: not implemented yet`);
  });
});
