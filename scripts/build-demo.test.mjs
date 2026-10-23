// The committed demo dataset must be exactly what scripts/build-demo.mjs writes: the script is the only
// author of src/lib/demo/data/belay-demo.json, so a hand edit of the JSON (or of the script without a rerun) is drift.
// The script is copied into a scratch tree and run there, so this test never touches the repo's own file.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eol = (s) => s.replace(/\r\n/g, '\n');

describe('scripts/build-demo.mjs', () => {
  it('regenerates the committed belay-demo.json byte for byte', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-demo-'));
    try {
      fs.mkdirSync(path.join(tmp, 'scripts'));
      fs.mkdirSync(path.join(tmp, 'src/lib/demo/data'), { recursive: true });
      fs.copyFileSync(path.join(root, 'scripts/build-demo.mjs'), path.join(tmp, 'scripts/build-demo.mjs'));
      const r = spawnSync(process.execPath, ['scripts/build-demo.mjs'], { cwd: tmp, encoding: 'utf8' });
      expect(r.status, r.stderr).toBe(0);
      const made = fs.readFileSync(path.join(tmp, 'src/lib/demo/data/belay-demo.json'), 'utf8');
      const committed = fs.readFileSync(path.join(root, 'src/lib/demo/data/belay-demo.json'), 'utf8');
      expect(eol(made)).toBe(eol(committed));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('holds the tier order once', () => {
    const src = fs.readFileSync(path.join(root, 'scripts/build-demo.mjs'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const copies = src.match(/\[\s*'quarantined'\s*,\s*'assisted'\s*,\s*'supervised'\s*,\s*'hands_off'\s*\]/g) ?? [];
    expect(copies).toHaveLength(1);
  });

  // The fleet reads which classes are never an agent's from actionClasses' ceilings, not from a second hand list:
  // a class added with ceiling human_only is seeded into a scratch copy and must never get an agent tier.
  it('keeps a newly added human-only class human-only across the fleet', () => {
    const src = fs.readFileSync(path.join(root, 'scripts/build-demo.mjs'), 'utf8');
    const seeded = src.replace(/(\n  \{ id: 'tier\.promote'[^\n]*\n)/, "$1  { id: 'zz.human', track: 'T3', ceiling: 'human_only', tier: 'human_only', lease_days: null, record: null },\n");
    expect(seeded).not.toBe(src);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-demo-'));
    try {
      fs.mkdirSync(path.join(tmp, 'scripts'));
      fs.mkdirSync(path.join(tmp, 'src/lib/demo/data'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'scripts/build-demo.mjs'), seeded);
      const r = spawnSync(process.execPath, ['scripts/build-demo.mjs'], { cwd: tmp, encoding: 'utf8' });
      expect(r.status, r.stderr).toBe(0);
      const { fleet } = JSON.parse(fs.readFileSync(path.join(tmp, 'src/lib/demo/data/belay-demo.json'), 'utf8'));
      const agentTier = fleet.projects.filter((p) => ![null, 'human_only'].includes(p.classTiers['zz.human'])).map((p) => p.id);
      expect(agentTier).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
