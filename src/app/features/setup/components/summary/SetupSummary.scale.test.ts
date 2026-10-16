import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Setup README says sizes follow --ui-scale. Every spacing length in the summary strip must sit inside a
// calc(Npx * var(--ui-scale)); a 1px hairline stays unscaled.
const css = readFileSync(join(__dirname, 'SetupSummary.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const scaled = /calc\(\s*\d+(?:\.\d+)?px\s*\*\s*var\(--ui-scale\)\s*\)/g;

describe('SetupSummary.module.css', () => {
  it('scales every px length with --ui-scale (hairlines excepted)', () => {
    const raw = css.replace(scaled, '').match(/\b\d+(?:\.\d+)?px\b/g) ?? [];
    expect(raw.filter((v) => v !== '1px')).toEqual([]);
  });
  it('has scaled lengths at all', () => {
    expect((css.match(scaled) ?? []).length).toBeGreaterThanOrEqual(8);
  });
});
