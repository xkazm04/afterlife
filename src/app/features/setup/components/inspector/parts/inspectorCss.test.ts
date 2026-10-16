// inspector.module.css is shared by the panels, so a rule nobody names stays forever. Every class in it must be read by a
// component under components/inspector (derived from the stylesheet and the sources, not from a list kept here).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const stripCss = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripTs = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Class names a stylesheet defines, with comments and declaration bodies removed. */
export const classesOf = (css: string): string[] => [...new Set([...stripCss(css).replace(/\{[^}]*\}/g, ' ').matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]!))];

/** The classes of `css` that no source in `sources` reads as styles.X or styles['X']. */
export const unused = (css: string, sources: string[]): string[] => {
  const code = sources.map(stripTs).join('\n');
  return classesOf(css).filter((c) => !new RegExp(`styles\\.${c}\\b|styles\\[\\s*['"]${c}['"]\\s*\\]`).test(code));
};

const sourcesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourcesUnder(join(dir, e.name)) : /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [readFileSync(join(dir, e.name), 'utf8')] : [],
  );

describe('inspector.module.css', () => {
  it('every class it defines is read by an inspector component', () => {
    const css = readFileSync(join(ROOT, 'inspector.module.css'), 'utf8');
    expect(classesOf(css).length).toBeGreaterThan(10);
    expect(unused(css, sourcesUnder(ROOT))).toEqual([]);
  });

  it('control: a class no source reads is reported, and a mention in a comment does not count', () => {
    expect(unused('.a { color: red; }\n.b { color: blue; }', ['const x = styles.a; // styles.b'])).toEqual(['b']);
  });
});

/** Lengths a stylesheet states in raw px: not inside calc(N px * var(--ui-scale)), and not a border or outline (a hairline stays 1px). */
export const rawPx = (css: string): string[] =>
  [...stripCss(css).matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].flatMap(([, prop, value]) =>
    /^(border|outline)(-(top|right|bottom|left))?(-width)?$/.test(prop!) ? [] : (value!.replace(/calc\(\s*[\d.]+px\s*\*\s*var\(--ui-scale\)\s*\)/g, '').match(/-?[\d.]+px/g) ?? []).map((v) => `${prop}: ${v}`),
  );

describe('Sizes follow --ui-scale (D10)', () => {
  const files = ['../inspector.module.css', '../../shared/DepRow.module.css', '../../shared/GateRow.module.css'];
  it.each(files)('%s states no raw px length', (f) => {
    expect(rawPx(readFileSync(join(__dirname, f), 'utf8'))).toEqual([]);
  });

  it('control: a raw gap and a bleed written in px are counted; a scaled length, a hairline and a comment are not', () => {
    const css = '/* gap: 9px */ .a { gap: 6px; margin: 0 -6px; width: calc(100% + 12px); border: 1px solid red; padding: calc(4px * var(--ui-scale)); }';
    expect(rawPx(css)).toEqual(['gap: 6px', 'margin: -6px', 'width: 12px']);
  });
});
