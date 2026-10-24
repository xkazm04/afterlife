import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { DB_MARKERS, LIST_ENV, SPAWN_MARKERS, WORKER_CAP, listedFiles, splitTiers, tierOf, workerCap } from './tiers.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tiers-test-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 }));
// The fixtures name the markers through the exported lists, so this file's own text stays `unit`.
const [DB, , , OPEN, PG] = DB_MARKERS;
const [CP] = SPAWN_MARKERS;
const put = (rel, text) => {
  fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
  fs.writeFileSync(path.join(tmp, rel), text);
};

describe('tierOf', () => {
  it('every db marker makes a db test, every spawn marker a spawn test', () => {
    for (const m of DB_MARKERS) expect(tierOf(`import x from '${m}';`), m).toBe('db');
    for (const m of SPAWN_MARKERS) expect(tierOf(`const r = ${m}`), m).toBe('spawn');
  });

  it('db wins over spawn', () => {
    expect(tierOf(`import { x } from 'node:${CP}';\nconst idx = await ${DB}();`)).toBe('db');
  });

  it('anything else is unit', () => {
    expect(tierOf("import { describe } from 'vitest';\nexpect(1 + 1).toBe(2);")).toBe('unit');
    expect(tierOf('')).toBe('unit');
  });
});

describe('splitTiers', () => {
  put('src/a/pure.test.ts', "import { x } from './x';");
  put('src/a/x.ts', `export const x = '${DB}';`); // a production module is not followed
  put('src/b/viaRig.test.ts', "import { rig } from './__tests__/rig';");
  put('src/b/__tests__/rig.ts', "import { boot } from '@/server/testing/boot';");
  put('src/server/testing/boot.ts', `export const boot = () => ${OPEN}();`);
  put('scripts/run.test.mjs', `import { x } from 'node:${CP}';`);
  put('node_modules/pkg/skip.test.ts', PG);
  const include = ['src/**/*.test.ts', 'scripts/**/*.test.mjs', '**/*.test.ts'];

  it('classifies by the test text and the helpers it reaches, each file once', () => {
    expect(splitTiers(tmp, include)).toEqual({
      unit: ['src/a/pure.test.ts'],
      db: ['src/b/viaRig.test.ts'],
      spawn: ['scripts/run.test.mjs'],
    });
  });

  it('keeps only the listed files when a list is handed over', () => {
    const at = path.join(tmp, 'list.txt');
    fs.writeFileSync(at, 'src/a/pure.test.ts\r\n./scripts/run.test.mjs\n\n');
    const only = listedFiles({ [LIST_ENV]: at });
    expect(splitTiers(tmp, include, only)).toEqual({ unit: ['src/a/pure.test.ts'], db: [], spawn: ['scripts/run.test.mjs'] });
    expect(listedFiles({})).toBeNull();
  });
});

describe('workerCap', () => {
  it('reads --maxWorkers in both forms, else the cap', () => {
    expect(workerCap(['node', 'vitest', 'run', '--maxWorkers=3'])).toBe('3');
    expect(workerCap(['node', 'vitest', '--maxWorkers', '2'])).toBe('2');
    expect(workerCap(['node', 'vitest', 'run'])).toBe(WORKER_CAP);
    expect(WORKER_CAP).toBe('33%');
    expect(workerCap(['node', 'vitest', 'run'], '25%')).toBe('25%');
  });
});
