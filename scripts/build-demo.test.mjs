// The committed demo dataset must be exactly what scripts/build-demo.mjs writes: the script (with its parts in
// scripts/demo/) is the only author of src/lib/demo/data/belay-demo.json, so a hand edit of the JSON (or of the script
// without a rerun) is drift. The script is copied into a scratch tree and run there, so no case touches the repo's file.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eol = (s) => s.replace(/\r\n/g, '\n');
const SOURCES = ['scripts/build-demo.mjs', ...fs.readdirSync(path.join(root, 'scripts/demo')).map((f) => `scripts/demo/${f}`)];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/** Runs the script in a scratch tree, each source first passed through `edit(rel, text)`; returns the JSON text. */
function build(edit = (_rel, text) => text) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-demo-'));
  try {
    fs.mkdirSync(path.join(tmp, 'scripts/demo'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'src/lib/demo/data'), { recursive: true });
    for (const rel of SOURCES) fs.writeFileSync(path.join(tmp, rel), edit(rel, read(rel)));
    const r = spawnSync(process.execPath, ['scripts/build-demo.mjs'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    return fs.readFileSync(path.join(tmp, 'src/lib/demo/data/belay-demo.json'), 'utf8');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

describe('scripts/build-demo.mjs', () => {
  it('regenerates the committed belay-demo.json byte for byte', () => {
    expect(eol(build())).toBe(eol(read('src/lib/demo/data/belay-demo.json')));
  });

  it('holds the tier order once', () => {
    const src = SOURCES.map((rel) => read(rel).replace(/^\s*\/\/.*$/gm, '')).join('\n');
    const copies = src.match(/\[\s*'quarantined'\s*,\s*'assisted'\s*,\s*'supervised'\s*,\s*'hands_off'\s*\]/g) ?? [];
    expect(copies).toHaveLength(1);
  });

  // The fleet reads which classes are never an agent's from actionClasses' ceilings, not from a second hand list:
  // a class added with ceiling human_only is seeded into a scratch copy and must never get an agent tier.
  it('keeps a newly added human-only class human-only across the fleet', () => {
    let seeded = 0;
    const json = build((rel, text) => {
      const out = text.replace(/(\n  \{ id: 'tier\.promote'[^\n]*\n)/, "$1  { id: 'zz.human', track: 'T3', ceiling: 'human_only', tier: 'human_only', lease_days: null, record: null },\n");
      if (out !== text) seeded += 1;
      return out;
    });
    expect(seeded).toBe(1);
    const { fleet } = JSON.parse(json);
    const agentTier = fleet.projects.filter((p) => ![null, 'human_only'].includes(p.classTiers['zz.human'])).map((p) => p.id);
    expect(agentTier).toEqual([]);
  });
});
