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
});
