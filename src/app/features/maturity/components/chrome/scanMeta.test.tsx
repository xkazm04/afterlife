// The toolbar's scan line and the status bar's counts, each branch: an age in minutes, "just now" after a rescan, no age in
// live mode (the view carries a clock time only), "not scanned"; the unknown count marked only when there is one.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScanMeta } from './ScanMeta';
import { StatusCounts } from './StatusCounts';

const text = (html: string): string => html.replace(/<[^>]+>/g, '').replace(/&nbsp;| /g, ' ');
const meta = (ageMin: number | null, scanned = true) => text(renderToStaticMarkup(createElement(ScanMeta, { engine: '1.4.0', scannedAt: '14:02', ageMin, cadence: 'weekly', scanned })));

describe('ScanMeta', () => {
  it('says the age in minutes, or just now once a rescan stamped it', () => {
    expect(meta(22)).toContain('scanned 14:02 · 22 min');
    expect(meta(0)).toContain('scanned 14:02 · just now');
  });
  it('shows no age when none is known, and "not scanned" before the first scan', () => {
    expect(meta(null)).toMatch(/scanned 14:02$/);
    expect(meta(null, false)).toContain('not scanned');
    expect(meta(null, false)).not.toContain('14:02');
  });
  it('always names the engine', () => {
    expect(meta(null, false)).toContain('engine 1.4.0');
  });
});

describe('StatusCounts', () => {
  it('counts each level, and marks the unknown count only when there is one', () => {
    const some = renderToStaticMarkup(createElement(StatusCounts, { levels: [3, 2, 1, 0, null] }));
    expect(text(some)).toBe('5 stages · 1 deep · 2 touched (1 running, 1 configured) · 1 absent · 1 unknown');
    expect(some).toMatch(/<span class="[^"]+">1 unknown<\/span>/);
    expect(renderToStaticMarkup(createElement(StatusCounts, { levels: [3, 4] }))).toContain('<span>0 unknown</span>');
  });
});
