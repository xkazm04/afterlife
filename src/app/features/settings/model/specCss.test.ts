// The Settings table (specRows, from TEXT_SIZE_SPEC) and the real scale (src/styles/text-size.css) are two hand-kept
// copies of one fact: 3 sizes x 9 measures. specRows.test.ts pins the table to literals, so it cannot see the CSS move.
// This reads the CSS itself and compares every measure.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TEXT_SIZES, TEXT_SIZE_SPEC, type TextSize, type TextSizeSpec } from '@/lib/settings/textSize';

const VAR: Record<keyof TextSizeSpec, string> = {
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

/** The declared value of every measure, per size, read from the css text (comments stripped first). */
function cssSpec(css: string): Record<TextSize, Record<string, number>> {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = {} as Record<TextSize, Record<string, number>>;
  for (const block of bare.matchAll(/html\[data-text-size="(\w+)"\]\s*\{([^}]*)\}/g)) {
    const vals: Record<string, number> = {};
    for (const d of (block[2] ?? '').matchAll(/(--[\w-]+)\s*:\s*([\d.]+)(?:px)?\s*;/g)) vals[d[1] ?? ''] = Number(d[2]);
    out[(block[1] ?? '') as TextSize] = vals;
  }
  return out;
}

/** Every (size, measure) where the css and TEXT_SIZE_SPEC disagree, as "size.measure css!=spec". */
function mismatches(css: string): string[] {
  const parsed = cssSpec(css);
  return TEXT_SIZES.flatMap((t) =>
    (Object.keys(VAR) as (keyof TextSizeSpec)[]).flatMap((m) => {
      const got = parsed[t]?.[VAR[m]];
      return got === TEXT_SIZE_SPEC[t][m] ? [] : [`${t}.${m} ${got}!=${TEXT_SIZE_SPEC[t][m]}`];
    }),
  );
}

const CSS = readFileSync(fileURLToPath(new URL('../../../../styles/text-size.css', import.meta.url)), 'utf8');

describe('text-size.css against TEXT_SIZE_SPEC', () => {
  it('declares all 27 measures (3 sizes x 9) exactly as the Settings table shows them', () => {
    expect(mismatches(CSS)).toEqual([]);
  });
  it('notices a value that moved (seeded control)', () => {
    expect(mismatches(CSS.replace('--t-body: 13px', '--t-body: 14px'))).toEqual(['smaller.body 14!=13']);
    expect(mismatches(CSS.replace('--ui-scale: 1.3;', '--ui-scale: 1.4;'))).toEqual(['larger.scale 1.4!=1.3']);
  });
});
