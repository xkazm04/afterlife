import { describe, expect, it } from 'vitest';
import { clipBox, cragGeom, markY, ropePath, wavyPath } from './geometry';

describe('cragGeom', () => {
  it('keeps a minimum size and scales it with the text size', () => {
    const small = cragGeom(100, 100, 1);
    expect(small.W).toBe(560);
    expect(small.H).toBe(320);
    const big = cragGeom(100, 100, 1.3);
    expect(big.W).toBeCloseTo(728);
    expect(big.L).toBeCloseTo(124.8);
  });

  it('puts R4 above R0 and spaces the nine columns evenly', () => {
    const g = cragGeom(1000, 600, 1);
    expect(g.Y0).toBe(544);
    expect(g.yOf(0)).toBe(g.Y0);
    expect(g.yOf(4)).toBe(44);
    expect(g.yOf(2)).toBe((g.Y0 + 44) / 2);
    expect(g.xOf(1) - g.xOf(0)).toBeCloseTo(g.colW);
    expect(g.xOf(8) + g.colW / 2).toBeCloseTo(g.W - g.RGT);
  });

  it('jitters bolts alternately and never on the ground', () => {
    const g = cragGeom(1000, 600, 1);
    expect(g.jig(3, 0)).toBe(0);
    expect(g.jig(0, 1)).toBeGreaterThan(0);
    expect(g.jig(0, 2)).toBeLessThan(0);
    expect(Math.abs(g.jig(0, 1))).toBeLessThanOrEqual(8);
  });

  it('draws the rope through each rung and the ground rung just below the line', () => {
    const g = cragGeom(1000, 600, 1);
    const d = ropePath(g, 4, 0, 3);
    expect(d.startsWith('M')).toBe(true);
    expect(d.split(' L')).toHaveLength(4);
    expect(d).toContain(`,${(g.Y0 + 14).toFixed(1)}`);
    expect(ropePath(g, 4, 2, 2).split(' L')).toHaveLength(1);
    expect(markY(g, 0, 4)).toBe(g.Y0 + 4);
    expect(markY(g, 3, 4)).toBe(g.yOf(3));
  });

  it('draws a contour of twelve curve segments', () => {
    const g = cragGeom(1000, 600, 1);
    expect(wavyPath(g, 300, 4, 1).match(/C/g)).toHaveLength(12);
  });
});

describe('clipBox', () => {
  it('sits right of its ring and flips left near the edge', () => {
    const g = cragGeom(1000, 600, 1);
    const a = clipBox(g, 'g1', 200);
    expect(a.x).toBe(212);
    expect(a.w).toBe(Math.round(2 * 6.7 + 14));
    const b = clipBox(g, 'g1 ✓', g.W - 20);
    expect(b.x).toBe(g.W - 20 - 12 - b.w);
  });
  it('grows with the label and with the text size', () => {
    const g1 = cragGeom(1000, 600, 1);
    const g2 = cragGeom(1000, 600, 1.3);
    expect(clipBox(g1, 'g1 ✓', 100).w).toBeGreaterThan(clipBox(g1, 'g1', 100).w);
    expect(clipBox(g2, 'g1', 100).w).toBeGreaterThan(clipBox(g1, 'g1', 100).w);
  });
});
