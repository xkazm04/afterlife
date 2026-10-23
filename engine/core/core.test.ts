import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseArgs } from './args';
import { inlineFiles } from './files';
import { EngineError, isoMs } from './types';
import { ulid } from './ulid';
import { ENGINE_VERSION, engineInfo, engineSha256 } from './version';
import { capture, ctx } from '../__tests__/helpers';
import { main } from '../cli';

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
  it('refuses a value on a switch: --write=false must not read as --write', () => {
    for (const a of ['--write=false', '--write=0', '--write=']) expect(() => parseArgs([a], spec), a).toThrow(/takes no value/);
    expect(parseArgs(['--write'], spec).has('write')).toBe(true);
  });
  it('refuses a stray argument where the command takes none: `--write false` must not write', () => {
    expect(() => parseArgs(['append', '--write', 'false'], { ...spec, positional: 1 })).toThrow(/unexpected argument "false"/);
    expect(parseArgs(['append', '--write'], { ...spec, positional: 1 }).positional).toEqual(['append']);
    for (const argv of [['gate', '--class', 'x', 'proof.json'], ['scan', 'dir'], ['pin', 'extra'], ['ledger', 'append', 'extra', '--chain', 'c.jsonl']]) {
      const c = capture();
      expect(main(argv, c.io), argv.join(' ')).toBe(2);
      expect((c.json() as { error?: string }).error, argv.join(' ')).toMatch(/unexpected argument/);
    }
  });
});

describe('gate reads a proof that is not there as wait, and one it cannot read as an error', () => {
  it('a --proof or --guardrail that is a directory is exit 2 with a JSON error naming EISDIR, not a wait', () => {
    for (const opt of ['--proof', '--guardrail']) {
      const c = capture();
      expect(main(['gate', '--class', 'dep-bump.patch', opt, tmp], c.io), opt).toBe(2);
      expect(c.json(), opt).toEqual({ error: expect.stringMatching(/\(EISDIR\)$/) });
    }
  });
});

describe('engine pin', () => {
  it('reports a version and a stable sha256 of its own source', () => {
    const info = engineInfo();
    expect(info.version).toBe(ENGINE_VERSION);
    expect(info.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(engineSha256()).toBe(info.sha256);
  });
  // What the hash covers (the import closure of engine/cli.ts) and what it ignores: ./pin.test.ts.
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

describe('isoMs', () => {
  it('takes an ISO instant with a zone and nothing Date.parse would merely tolerate', () => {
    expect(isoMs('2026-10-21T14:20:05Z', 't')).toBe(Date.UTC(2026, 9, 21, 14, 20, 5));
    expect(isoMs('2026-10-21T16:20:05.500+02:00', 't')).toBe(Date.UTC(2026, 9, 21, 14, 20, 5, 500));
    for (const v of ['10', '2026', '3/4/2026', 'Oct 5 2026', '2026-10-05', '2026-10-05T10:00:00', '2026-13-45T99:00:00Z', '', null, 7]) expect(() => isoMs(v, 't'), String(v)).toThrow(/t must be an ISO time/);
  });
});

describe('the documented options are the parsed options', () => {
  const dir = path.join(import.meta.dirname, '..');
  const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  const optionsOf = (cmd: string): string[] => {
    const src = strip(fs.readFileSync(path.join(dir, 'commands', `${cmd}.ts`), 'utf8'));
    return [...src.matchAll(/(?:values|switches): \[([^\]]*)\]/g)].flatMap((m) => [...(m[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((o) => o[1] as string));
  };
  const usage = strip(fs.readFileSync(path.join(dir, 'cli.ts'), 'utf8')).split('const USAGE = `')[1]?.split('`')[0] ?? '';
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8').split('\n');
  const block = (lines: string[], start: (l: string) => boolean): string => {
    const at = lines.findIndex(start);
    return lines.slice(at, lines.findIndex((l, i) => i > at && !l.startsWith('    '))).join(' ');
  };
  for (const cmd of ['prove', 'envelope', 'gate', 'tripwire', 'ledger', 'scan']) {
    it(`${cmd}: every option parseArgs accepts is in the usage text and the README table`, () => {
      const opts = optionsOf(cmd);
      expect(opts.length, 'found its parseArgs options').toBeGreaterThan(0);
      const u = block(usage.split('\n'), (l) => l.startsWith(`  ${cmd} `));
      const r = readme.find((l) => l.startsWith(`| \`${cmd} `)) ?? '';
      expect(opts.filter((o) => !u.includes(`--${o}`)), 'missing from USAGE in engine/cli.ts').toEqual([]);
      expect(opts.filter((o) => !r.includes(`--${o}`)), 'missing from engine/README.md').toEqual([]);
    });
  }
});
