import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// A var() naming a custom property nobody defines, with no fallback, makes the whole declaration invalid at computed
// time: `box-shadow: ring, shade, var(--glow)` lost the ring and the shade too. Every var() in the palette, the
// inspector blocks and the overlays must name a global (src/styles: tokens.css, text-size.css), one its own file
// defines, or carry a fallback.
const SRC = join(process.cwd(), 'src');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const read = (p: string) => strip(readFileSync(p, 'utf8'));
const cssIn = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.css'))
    .map((f) => join(dir, f));
const defined = (text: string) => new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] as string));

const globals = defined(cssIn(join(SRC, 'styles')).map(read).join('\n'));
const files = ['components/palette', 'components/inspector', 'components/overlays'].flatMap((d) => cssIn(join(SRC, d)));

describe('every var() in the palette, inspector and overlays resolves', () => {
  it('reads the globals and the files it checks', () => {
    expect(globals.has('--accent')).toBe(true);
    expect(globals.has('--ui-scale')).toBe(true);
    expect(files.length).toBeGreaterThan(10);
  });
  it.each(files.map((p) => [relative(SRC, p).replace(/\\/g, '/'), p]))('%s', (_name, p) => {
    const text = read(p);
    const own = defined(text);
    // var(--x) or var(--x, fallback): only the bare form can leave the declaration with nothing
    const bare = [...text.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1] as string);
    expect(bare.filter((v) => !globals.has(v) && !own.has(v))).toEqual([]);
  });
});
