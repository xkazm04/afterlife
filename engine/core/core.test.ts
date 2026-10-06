import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseArgs } from './args';
import { inlineFiles } from './files';
import { EngineError } from './types';
import { ulid } from './ulid';
import { ENGINE_VERSION, engineInfo, engineSha256 } from './version';
import { ctx } from '../__tests__/helpers';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-core-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('parseArgs', () => {
  const spec = { values: ['class', 'env'], switches: ['write'] };
  it('reads --key value, --key=value, repeats and switches', () => {
    const a = parseArgs(['append', '--class', 'x', '--env=a', '--env', 'b', '--write'], spec);
    expect(a.positional).toEqual(['append']);
    expect(a.get('class')).toBe('x');
    expect(a.all('env')).toEqual(['a', 'b']);
    expect(a.has('write')).toBe(true);
    expect(a.has('class')).toBe(true);
    expect(a.get('nothing')).toBeUndefined();
  });
  it('refuses unknown options, missing values and missing required options', () => {
    expect(() => parseArgs(['--nope', '1'], spec)).toThrow(EngineError);
    expect(() => parseArgs(['--class'], spec)).toThrow(/needs a value/);
    expect(() => parseArgs([], spec).need('class')).toThrow(/missing --class/);
  });
});

describe('engine pin', () => {
  it('reports a version and a stable sha256 of its own source', () => {
    const info = engineInfo();
    expect(info.version).toBe(ENGINE_VERSION);
    expect(info.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(engineSha256()).toBe(info.sha256);
  });

  it('changes when a source file changes, ignores tests, fixtures and line endings', () => {
    const root = path.join(tmp, 'engine');
    fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
    fs.mkdirSync(path.join(root, '__fixtures__'));
    fs.writeFileSync(path.join(root, 'a.ts'), 'export const a = 1;\nexport const b = 2;\n');
    fs.writeFileSync(path.join(root, 'sub', 'b.ts'), 'export const c = 3;\n');
    const before = engineSha256(root);
    fs.writeFileSync(path.join(root, 'a.test.ts'), 'noise');
    fs.writeFileSync(path.join(root, '__fixtures__', 'x.ts'), 'noise');
    fs.writeFileSync(path.join(root, 'README.md'), 'noise');
    expect(engineSha256(root)).toBe(before);
    fs.writeFileSync(path.join(root, 'a.ts'), 'export const a = 1;\r\nexport const b = 2;\r\n');
    expect(engineSha256(root)).toBe(before);
    fs.writeFileSync(path.join(root, 'sub', 'b.ts'), 'export const c = 4;\n');
    expect(engineSha256(root)).not.toBe(before);
  });
});

describe('inlineFiles and ulid', () => {
  it('replaces {"$file": path} with the file text, relative to the input, anywhere in the tree', () => {
    fs.writeFileSync(path.join(tmp, 'note.txt'), 'hello');
    const out = inlineFiles(ctx, { a: { $file: 'note.txt' }, list: [{ $file: 'note.txt' }, 1], keep: { $file: 'note.txt', other: 1 } }, tmp) as Record<string, unknown>;
    expect(out.a).toBe('hello');
    expect(out.list).toEqual(['hello', 1]);
    expect(out.keep).toEqual({ $file: 'note.txt', other: 1 });
    expect(() => inlineFiles(ctx, { $file: 'absent.txt' }, tmp)).toThrow(/cannot read/);
  });
  it('makes sortable 26-character ids', () => {
    const a = ulid(new Date('2026-10-09T00:00:00Z'));
    const b = ulid(new Date('2026-10-10T00:00:00Z'));
    expect(a).toHaveLength(26);
    expect(a < b).toBe(true);
  });
});
