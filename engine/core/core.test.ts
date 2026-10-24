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

describe('an optional path given empty is refused, not read as the working directory or as absent', () => {
  it('scan --dir "", gate --diff "" / --proof "" / --agent "" / --engine-sha "", prove --files-root "" exit 2 naming the option', () => {
    const cases: [string, string[]][] = [
      ['dir', ['scan', '--dir', '']],
      ['facts', ['scan', '--facts', '']],
      ['diff', ['gate', '--class', 'dep-bump.patch', '--diff', '']],
      ['proof', ['gate', '--class', 'dep-bump.patch', '--proof', '']],
      ['guardrail', ['gate', '--class', 'dep-bump.patch', '--guardrail', '']],
      // an unset $BELAY_AGENT is not "no agent named" (the sole holder's tier), nor an unset sha "no pin" (the build check skipped)
      ['agent', ['gate', '--class', 'dep-bump.patch', '--agent', '']],
      ['engine-sha', ['gate', '--class', 'dep-bump.patch', '--engine-sha', '']],
      ['policy', ['prove', '--class', 'rerun-stats', '--input', 'engine/__fixtures__/rerun/flake.json', '--policy', '']],
      ['policy', ['envelope', '--class', 'code-fix.patch', '--diff', 'x.diff', '--policy', '']],
      ['state', ['gate', '--class', 'dep-bump.patch', '--state', '']],
      ['state', ['tripwire', '--event', 'x.json', '--state', '']],
      ['files-root', ['prove', '--class', 'rerun-stats', '--input', 'engine/__fixtures__/rerun/flake.json', '--files-root', '']],
    ];
    for (const [opt, argv] of cases) {
      const c = capture();
      expect(main(argv, c.io), opt).toBe(2);
      expect(c.json(), opt).toEqual({ error: `option --${opt} needs a value` });
    }
  });
});

describe('gate: a guardrail whose verdict and label disagree is not a pass', () => {
  it('{verdict: pass, label: guardrail::block} waits, naming both; agreeing ones pass as before', () => {
    const run = (argv: string[]) => { const c = capture(); return { code: main(argv, c.io), json: c.json() as Record<string, unknown> }; };
    const proof = path.join(tmp, 'gproof.json');
    fs.writeFileSync(proof, JSON.stringify(run(['prove', '--class', 'exploit-test', '--input', 'engine/__fixtures__/exploit/input.pass.json']).json));
    const gate = (g: object) => { fs.writeFileSync(path.join(tmp, 'g.json'), JSON.stringify(g)); return run(['gate', '--class', 'dep-bump.patch', '--proof', proof, '--guardrail', path.join(tmp, 'g.json')]).json; };
    expect(gate({ verdict: 'pass', label: 'guardrail::pass' }).decision).toBe('approve');
    expect(gate({ label: 'guardrail::pass' }).decision).toBe('approve');
    const split = gate({ verdict: 'pass', label: 'guardrail::block' });
    expect(split.decision).toBe('wait');
    expect(split.reasons).toContainEqual(expect.stringMatching(/verdict pass, label block/));
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
    expect(isoMs('2028-02-29T00:00Z', 't')).toBe(Date.UTC(2028, 1, 29)); // a leap day is a day
    // Date.parse rolls a day the month does not have into the next month: 2026-02-31 would read as 2026-03-03
    for (const v of ['2026-02-29T00:00Z', '2026-02-31T10:00:00Z', '2026-04-31T00:00:00+02:00']) expect(() => isoMs(v, 't'), v).toThrow(/t must be an ISO time/);
    for (const v of ['10', '2026', '3/4/2026', 'Oct 5 2026', '2026-10-05', '2026-10-05T10:00:00', '2026-13-45T99:00:00Z', '', null, 7]) expect(() => isoMs(v, 't'), String(v)).toThrow(/t must be an ISO time/);
  });
});

describe('an unexpected error (an engine bug, not bad input) is still exit 2, and stderr says where it came from', () => {
  it('stdout keeps the one-line {error}; stderr adds the stack, so a CI log locates the bug', () => {
    const c = capture();
    const io = { ...c.io, now: (): Date => { throw new TypeError('clock broke'); } };
    expect(main(['gate', '--class', 'dep-bump.patch'], io)).toBe(2);
    expect(c.json()).toEqual({ error: 'unexpected: clock broke' });
    expect(c.err()).toMatch(/^engine gate: error: unexpected: clock broke\nTypeError: clock broke\n\s+at /);
  });
  it('an EngineError (bad input) prints its one line only', () => {
    const c = capture();
    expect(main(['gate'], c.io)).toBe(2);
    expect(c.err()).toBe('engine gate: error: missing --class\n');
  });
});
