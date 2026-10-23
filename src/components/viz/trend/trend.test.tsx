// The trend glyphs: TrendDelta never says 0 for unknown (a dash), signs a known change and its arrow; TrendStrip pads a
// young history with dashed cells; the CSS draws in tokens only, never amber nor alarm red.
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TrendDelta } from './TrendDelta';
import { TrendStrip } from './TrendStrip';

const name = (html: string): string => /aria-label="([^"]*)"/.exec(html)?.[1] ?? '';
const text = (html: string): string => html.replace(/<[^>]+>/g, '');

describe('TrendDelta', () => {
  it('unknown is a dash, never 0', () => {
    const out = renderToStaticMarkup(<TrendDelta value={null} label="waiting" />);
    expect(text(out)).toBe('-');
    expect(name(out)).toBe('waiting: no week to compare yet');
    expect(out).not.toContain('0');
  });
  it('a known change is signed with its arrow; no change is a flat 0', () => {
    expect(text(renderToStaticMarkup(<TrendDelta value={2} label="waiting" />))).toBe('↑ +2');
    expect(text(renderToStaticMarkup(<TrendDelta value={-1} label="waiting" />))).toBe('↓ -1');
    expect(text(renderToStaticMarkup(<TrendDelta value={0} label="waiting" />))).toBe('→ 0');
    expect(name(renderToStaticMarkup(<TrendDelta value={2} label="waiting" />))).toBe('waiting +2 since last week');
  });
  it('takes a hover text, the pending line say', () => {
    expect(renderToStaticMarkup(<TrendDelta value={null} label="waiting" title="trend starts after 7 days of polling (2 so far)" />)).toContain('title="trend starts after 7 days of polling (2 so far)"');
  });
});

describe('TrendStrip', () => {
  it('draws 28 cells, a young history padded with dashed gaps, unknown days dashed too', () => {
    const out = renderToStaticMarkup(<TrendStrip values={[1, null, 3]} label="waiting" />);
    expect(out.match(/<i /g)).toHaveLength(28);
    expect(out.match(/--h:/g)).toHaveLength(2);
    expect(name(out)).toBe('waiting over 3 days: 1 to 3, now 3');
    expect(name(renderToStaticMarkup(<TrendStrip values={[]} label="stale" />))).toBe('stale: no days recorded');
  });
});

describe('trend.module.css', () => {
  it('uses tokens only: no raw colour, no amber, no alarm red, sizes by the ui scale', () => {
    const css = fs.readFileSync(path.join(__dirname, 'trend.module.css'), 'utf8');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
    expect(css).not.toMatch(/--needs-you|--fail|--stale/);
    for (const m of css.matchAll(/(?<!calc\()\b(\d+)px\b/g)) expect(Number(m[1])).toBeLessThanOrEqual(1);
  });
});
