// D10 (src/styles/text-size.css, src/components/README.md "Sizes"): every component sizes itself from the text-size
// variables, never from literal px. The chips, badges and glyphs drawn in every table row had their heights scaled
// (--chip-h, --mini-h) but kept raw px spacing, so at Larger a chip grew taller and not wider inside.
// Gated here for every stylesheet of status/, viz/ and surface/ (derived from the folders, not listed).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const BOX = /^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)(-[a-z]+)?$|^(min-|max-)?(width|height)$/;

/** Box-model lengths stated in raw px above a 1px hairline, outside calc(N px * var(--ui-scale)). */
export const rawSpacing = (css: string): string[] =>
  [...strip(css).matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].flatMap(([, prop, value]) =>
    BOX.test(prop!)
      ? (value!.replace(/calc\(\s*[\d.]+px\s*\*\s*var\(--ui-scale\)\s*\)/g, '').match(/-?[\d.]+px/g) ?? [])
          .filter((v) => Math.abs(parseFloat(v)) > 1)
          .map((v) => `${prop}: ${v}`)
      : [],
  );

const ROOT = join(__dirname, '../..');
const sheets = ['status', 'viz', 'surface'].flatMap((d) =>
  readdirSync(join(ROOT, d), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.module.css'))
    .map((f) => `${d}/${f.replaceAll('\\', '/')}`),
);

describe('status, viz and surface spacing follows --ui-scale (D10)', () => {
  it('the folder scan finds the stylesheets, nested ones included', () => {
    expect(sheets).toEqual(expect.arrayContaining(['status/chip/Chip.module.css', 'viz/trend/trend.module.css', 'surface/Card.module.css']));
  });

  it.each(sheets)('%s states no raw px spacing', (f) => {
    expect(rawSpacing(readFileSync(join(ROOT, f), 'utf8'))).toEqual([]);
  });

  it('control: raw padding and gap are counted; a scaled length, a 1px hairline gap, a border and a comment are not', () => {
    const css = '/* gap: 9px */ .a { gap: 4px; padding: 0 6px 0 calc(3px * var(--ui-scale)); border: 2px solid red; } .b { gap: 1px; min-width: 3px; }';
    expect(rawSpacing(css)).toEqual(['gap: 4px', 'padding: 6px', 'min-width: 3px']);
  });
});
