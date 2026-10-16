// sections.module.css and popover.module.css state "sizes are the prototype's px times --ui-scale": spacing must follow the
// text size like the row heights beside it. Measured from the stylesheets, comments stripped.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stripCss = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const SPACING = /^(gap|row-gap|column-gap|padding(-\w+)?|margin(-\w+)?)$/;

/** Spacing declarations that state a raw px length instead of calc(N px * var(--ui-scale)). */
export const unscaledSpacing = (css: string): string[] =>
  [...stripCss(css).matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].flatMap(([, prop, value]) =>
    !SPACING.test(prop!) ? [] : (value!.replace(/calc\([^()]*var\(--ui-scale\)\s*\)/g, '').match(/-?[\d.]+px/g) ?? []).map((v) => `${prop}: ${v}`),
  );

const css = (rel: string) => readFileSync(join(__dirname, rel), 'utf8');
const block = (src: string, cls: string): string => stripCss(src).match(new RegExp(String.raw`(?:^|\})\s*\.` + cls + String.raw`\s*\{([^}]*)\}`))?.[1] ?? '';

describe('fleet inspector and popover spacing', () => {
  it.each([['sections.module.css'], ['../../popover/popover.module.css']])('%s: no raw px gap, padding or margin', (f) => {
    expect(unscaledSpacing(css(f))).toEqual([]);
  });

  it('control: a raw px gap is reported and a scaled one is not', () => {
    expect(unscaledSpacing('.a { gap: 6px; padding: 3px calc(4px * var(--ui-scale)); margin: 0 -4px; }')).toEqual(['gap: 6px', 'padding: 3px', 'margin: -4px']);
    expect(unscaledSpacing('.a { gap: calc(6px * var(--ui-scale)); margin: 0 calc(-4px * var(--ui-scale)); }')).toEqual([]);
  });

  it('the tier name in Autonomy by class truncates inside its 72px track instead of spilling over the next row', () => {
    const tn = block(css('sections.module.css'), 'tn');
    expect(tn).toMatch(/overflow:\s*hidden/);
    expect(tn).toMatch(/text-overflow:\s*ellipsis/);
    expect(tn).toMatch(/white-space:\s*nowrap/);
  });
});
