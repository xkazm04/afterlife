import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The kit says "every shared component in every state". These are the specimens a reader would look for that the
// gallery once lacked; a name only counts when it appears in the kit's code (comments stripped), not its prose.
const WANTED = ['DetailPage', 'EntityNotFound', 'ErrorView', 'NotFoundView', 'ShellLoading', 'ToolbarButton', 'HelpButton', 'ToastProvider'];

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('kit specimen coverage', () => {
  it('names every wanted shared component somewhere in the kit', () => {
    const files = walk(__dirname).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
    const code = files.map((f) => strip(readFileSync(f, 'utf8'))).join('\n');
    expect(WANTED.filter((n) => !new RegExp(`\\b${n}\\b`).test(code))).toEqual([]);
  });
});
