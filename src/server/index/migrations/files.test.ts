// MIGRATIONS is a hand-written import list: a migration file added to steps/ or later/ and not listed there would never
// run, and nothing else would notice. The list must be exactly the files on disk, numbered 1..N with no gap.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from './migrate';

const FILE = /^(\d{4})_(\w+)\.ts$/;

const onDisk = (): { version: number; folder: string; file: string }[] =>
  ['steps', 'later'].flatMap((folder) =>
    fs.readdirSync(path.join(__dirname, folder))
      .filter((f) => !f.endsWith('.test.ts'))
      .map((file) => ({ version: Number(FILE.exec(file)?.[1] ?? NaN), folder, file })),
  );

describe('migration files', () => {
  it('every file in steps/ and later/ is named NNNN_name.ts', () => {
    expect(onDisk().filter((f) => Number.isNaN(f.version)).map((f) => `${f.folder}/${f.file}`)).toEqual([]);
  });

  it('MIGRATIONS lists exactly the files on disk, by version', () => {
    const disk = onDisk().map((f) => f.version).sort((a, b) => a - b);
    expect(MIGRATIONS.map((m) => m.version)).toEqual(disk);
  });

  it('versions run 1..N in order with no gap or repeat', () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
  });
});
