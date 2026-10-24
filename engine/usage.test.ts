// The usage text in cli.ts and the command table in README.md are written by hand. What they must name is derived from
// the code, never listed here: the commands from cli.ts's COMMANDS table, each command's file from cli.ts's imports, its
// options from its parseArgs call, and a sub-command (`ledger trial`) from the ./audit file its command hands off to.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = import.meta.dirname;
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
const read = (rel: string): string => strip(fs.readFileSync(path.join(dir, rel), 'utf8'));
const optionsOf = (src: string): string[] =>
  [...src.matchAll(/(?:values|switches): \[([^\]]*)\]/g)].flatMap((m) => [...(m[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((o) => o[1] as string));

const cli = read('cli.ts');
const usage = (cli.split('const USAGE = `')[1]?.split('`')[0] ?? '').split('\n');
const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8').split('\n');
const table = cli.split('const COMMANDS')[1]?.split('\n};')[0] ?? '';
const commands = [...table.matchAll(/^ {2}([a-z]+):/gm)].map((m) => m[1] as string);
/** cli.ts imports `{ fooCommand } from './commands/foo'`: the file behind each COMMANDS entry that names a function. */
const fileOf = (cmd: string): string | undefined => {
  const fn = new RegExp(`^ {2}${cmd}: (\\w+),`, 'm').exec(table)?.[1];
  const from = fn && new RegExp(`import \\{[^}]*\\b${fn}\\b[^}]*\\} from '\\./(commands/[\\w/]+)'`).exec(cli)?.[1];
  return from ? `${from}.ts` : undefined;
};

interface Entry { name: string; src: string; not: string[] }
const entries: Entry[] = commands.flatMap((cmd) => {
  const file = fileOf(cmd);
  if (!file) return [];
  const src = read(file);
  const subs = [...src.matchAll(/from '\.\/audit\/(\w+)'/g)].map((m) => m[1] as string);
  const own: Entry = { name: cmd, src, not: subs.map((s) => `${cmd} ${s}`) };
  return [own, ...subs.map((s) => ({ name: `${cmd} ${s}`, src: read(path.join(path.dirname(file), 'audit', `${s}.ts`)), not: [] }))];
});

/** `  name` alone or `  name <rest>` in USAGE; `| \`name\`` or `| \`name <rest>` in the README table. */
const isUsage = (l: string, name: string): boolean => l === `  ${name}` || l.startsWith(`  ${name} `);
const isRow = (l: string, name: string): boolean => l.startsWith(`| \`${name} `) || l.startsWith(`| \`${name}\``);
/** A usage entry's lines: its first line and the indented lines that continue it. */
function usageOf(e: Entry): string {
  const out: string[] = [];
  let mine = false;
  for (const l of usage) {
    if (!l.startsWith('    ')) mine = isUsage(l, e.name) && !e.not.some((n) => isUsage(l, n));
    if (mine) out.push(l);
  }
  return out.join(' ');
}
const readmeOf = (e: Entry): string =>
  readme.filter((l) => isRow(l, e.name) && !e.not.some((n) => isRow(l, n))).join(' ');

describe('the documented commands and options are the parsed ones', () => {
  it('found the command table, a file per command and the ledger trial sub-command', () => {
    expect(commands.length, 'COMMANDS keys').toBeGreaterThan(5);
    expect(entries.map((e) => e.name)).toContain('ledger trial');
  });

  it('every COMMANDS entry has a line in USAGE and a row in the README table', () => {
    expect(commands.filter((c) => !usage.some((l) => isUsage(l, c))), 'missing from USAGE in engine/cli.ts').toEqual([]);
    expect(commands.filter((c) => !readme.some((l) => isRow(l, c))), 'missing from engine/README.md').toEqual([]);
  });

  for (const e of entries) {
    it(`${e.name}: every option parseArgs accepts is in its own usage line and README row`, () => {
      const opts = optionsOf(e.src);
      expect(opts.length, 'found its parseArgs options').toBeGreaterThan(0);
      const [u, r] = [usageOf(e), readmeOf(e)];
      expect(opts.filter((o) => !u.includes(`--${o}`)), 'missing from USAGE in engine/cli.ts').toEqual([]);
      expect(opts.filter((o) => !r.includes(`--${o}`)), 'missing from engine/README.md').toEqual([]);
    });
  }
});
