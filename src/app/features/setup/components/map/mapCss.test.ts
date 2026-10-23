// The unlock map's stylesheets, read from the folders (not a list kept here), so a sheet added under map/ is gated the day
// it lands. README: "Sizes follow --ui-scale (D10)"; the summary strip and the inspector already hold to it by test.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const stripCss = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const under = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? under(join(dir, e.name), ext) : ext.test(e.name) ? [join(dir, e.name)] : []));
const SHEETS = under(__dirname, /\.module\.css$/);

/** Spacing (gap, margin, padding) a stylesheet states in raw px: outside calc(N px * var(--ui-scale)); a 1px nudge stays. */
export const rawSpacing = (css: string): string[] =>
  [...stripCss(css).matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].flatMap(([, prop, value]) =>
    /^(gap|row-gap|column-gap|margin|padding)(-[\w-]+)?$/.test(prop!)
      ? (value!.replace(/calc\(\s*[\d.]+px\s*\*\s*var\(--ui-scale\)\s*\)/g, '').match(/-?[\d.]+px/g) ?? []).filter((v) => v !== '1px').map((v) => `${prop}: ${v}`)
      : [],
  );

describe('Sizes follow --ui-scale (D10) on the unlock map', () => {
  it('the folders hold the map, edge, column and node sheets', () => expect(SHEETS.length).toBeGreaterThanOrEqual(5));
  it.each(SHEETS.map((f) => relative(__dirname, f)))('%s states no raw px spacing', (f) => {
    expect(rawSpacing(readFileSync(join(__dirname, f), 'utf8'))).toEqual([]);
  });
  it('control: a raw gap and margin are counted; a scaled length, a radius, a 1px nudge and a comment are not', () => {
    const css = '/* gap: 9px */ .a { gap: 3px; margin: 0 0 4px 1px; border-radius: 6px; padding: calc(4px * var(--ui-scale)); }';
    expect(rawSpacing(css)).toEqual(['gap: 3px', 'margin: 4px']);
  });
});

/** Attributes a stylesheet's selectors test ([data-dim="true"], [aria-pressed]), declaration bodies and comments removed. */
export const selectedAttrs = (css: string): string[] => [...new Set([...stripCss(css).replace(/\{[^}]*\}/g, ' ').matchAll(/\[\s*([\w-]+)/g)].map((m) => m[1]!))];
/** The attributes of `css` that no source renders as a JSX prop (`name=`). */
export const unrendered = (css: string, sources: string[]): string[] => {
  const code = sources.map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')).join('\n');
  return selectedAttrs(css).filter((a) => !new RegExp(`\\s${a}=`).test(code));
};

describe('the map sheets select only attributes the map renders', () => {
  const sources = under(__dirname, /\.tsx$/).filter((f) => !/\.test\./.test(f)).map((f) => readFileSync(f, 'utf8'));
  it.each(SHEETS.map((f) => relative(__dirname, f)))('%s', (f) => {
    expect(unrendered(readFileSync(join(__dirname, f), 'utf8'), sources)).toEqual([]);
  });
  it('control: an attribute no source renders is reported, one in a comment does not count', () => {
    expect(unrendered('.a[data-x="1"] { color: red } .b[data-y] { }', ['<b data-y={1} /> // data-x={1}'])).toEqual(['data-x']);
  });
});
