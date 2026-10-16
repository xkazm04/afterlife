import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEXT_SIZE_SPEC, TEXT_SIZES, type TextSizeSpec } from './textSize';

// TEXT_SIZE_SPEC is the table the Settings screen prints; styles/text-size.css is what the page is drawn from. The two are
// typed by hand, so this reads the CSS and holds the table to it.
const CSS = readFileSync(join(process.cwd(), 'src/styles/text-size.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const VARIABLE: Record<keyof TextSizeSpec, string> = {
  body: '--t-body',
  head: '--t-head',
  small: '--t-small',
  row: '--row-h',
  headerRow: '--hdr-h',
  toolbar: '--tb-h',
  statusBar: '--sb-h',
  sidebar: '--sbw',
  scale: '--ui-scale',
};

function cssSpec(size: string): Record<string, number> {
  const block = new RegExp(`html\\[data-text-size="${size}"\\]\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? '';
  const out: Record<string, number> = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([\d.]+)(?:px)?\s*;/g)) out[m[1] as string] = Number(m[2]);
  return out;
}

describe('TEXT_SIZE_SPEC matches text-size.css', () => {
  for (const size of TEXT_SIZES) {
    it(`${size}: all ${Object.keys(VARIABLE).length} figures`, () => {
      const css = cssSpec(size);
      const table = Object.fromEntries(Object.entries(VARIABLE).map(([k, v]) => [v, TEXT_SIZE_SPEC[size][k as keyof TextSizeSpec]]));
      expect(table).toEqual(Object.fromEntries(Object.entries(VARIABLE).map(([, v]) => [v, css[v]])));
    });
  }
});
