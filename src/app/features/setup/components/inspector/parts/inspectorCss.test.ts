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
