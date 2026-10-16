// The cell padding and the tree indent must follow --ui-scale like the column tracks (columns.ts px()) and .disc beside them.
// Measured from the stylesheet, comments stripped.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = strip(readFileSync(join(__dirname, '../table.module.css'), 'utf8'));

/** The padding value(s) a rule with exactly this selector declares. */
export const paddingOf = (src: string, selector: string): string[] => {
  const esc = selector.replace(/[.]/g, String.raw`\.`);
  const body = src.match(new RegExp(String.raw`(?:^|\})\s*` + esc + String.raw`\s*\{([^}]*)\}`))?.[1] ?? '';
  return [...body.matchAll(/padding(?:-\w+)?\s*:\s*([^;]+)/g)].map((m) => m[1]!.trim());
};
/** A raw px length left once the scaled calc() forms are removed ("0" is not a length). */
export const rawPx = (value: string): string[] => value.replace(/calc\([^()]*var\(--ui-scale\)\s*\)/g, '').match(/-?[\d.]+px/g) ?? [];

describe('table cell padding and tree indent scale with --ui-scale', () => {
  it.each([['.c'], ['.indent'], ['.flat .indent']])('%s: padding is scaled', (sel) => {
    const found = paddingOf(css, sel);
    expect(found.length).toBeGreaterThan(0);
    for (const v of found) {
      expect(v).toContain('var(--ui-scale)');
      expect(rawPx(v)).toEqual([]);
    }
  });

  it('control: a raw px padding is reported and a scaled one is not', () => {
    expect(rawPx('0 6px')).toEqual(['6px']);
    expect(rawPx('0 calc(6px * var(--ui-scale))')).toEqual([]);
    expect(paddingOf('.c { padding: 0 6px; }', '.c')).toEqual(['0 6px']);
  });
});
