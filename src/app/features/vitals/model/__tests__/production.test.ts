import { describe, expect, it } from 'vitest';
import type { ProdPoint } from '@/schemas/vitals';
import { MARKERS, NOW, PROD } from '../../data/__fixtures__/grinex';
import { aggregate, CELLS, placeMarkers, productionRows, WINDOW_MS } from '../production';

const nowMs = Date.parse(NOW);
const rows = productionRows(PROD, MARKERS, nowMs);
const row = (s: string) => rows.find((r) => r.signal === s)!;
const pt = (value: number, n: number): ProdPoint => ({ key: 'k', signal: 'p95-ms', binStart: NOW, binMin: 60, value, n });

describe('productionRows', () => {
  it('one row per signal, in the fixed order', () => {
    expect(rows.map((r) => r.signal)).toEqual(['requests', 'failed-rate', 'p95-ms', 'exceptions', 'availability']);
  });
  it('counts add up over the last 24 h; rates are the n-weighted mean', () => {
    expect(row('requests').last24).toBe(24 * 1200);
    expect(row('exceptions').last24).toBe(24 * 3);
    expect(row('failed-rate').last24).toBeCloseTo(0.008);
    expect(row('p95-ms').n24).toBe(24 * 1200);
  });
  it('a signal with no bin in the last 24 h has no figure, never 0, and its empty trend cells are null', () => {
    const a = row('availability');
    expect(a).not.toHaveProperty('last24');
    expect(a.n24).toBe(0);
    expect(a.trend).toHaveLength(CELLS);
    expect(a.trend.slice(-5)).toEqual([null, null, null, null, null]);
    expect(a.trend[0]).toBeCloseTo(99.9);
  });
  it('aggregate weights by n, and falls back to a plain mean when no bin has a sample', () => {
    expect(aggregate('p95-ms', [pt(100, 3), pt(200, 1)])).toBe(125);
    expect(aggregate('p95-ms', [pt(100, 0), pt(200, 0)])).toBe(150);
    expect(aggregate('p95-ms', [])).toBeUndefined();
  });
});

describe('deploy markers on the trend', () => {
  it('places a deploy by its time across the 7-day window and drops one outside it', () => {
    const m = placeMarkers(MARKERS, nowMs);
    expect(m.map((x) => x.runId)).toEqual(['904']);
    const expected = (Date.parse(MARKERS[0]!.at) - (nowMs - WINDOW_MS)) / WINDOW_MS;
    expect(m[0]!.x).toBeCloseTo(expected);
    expect(m[0]!.x).toBeGreaterThan(6 / 7 - 0.01);
  });
  it('the edges are inside: now is 1, the window start 0, a future deploy is dropped', () => {
    const mk = (ms: number) => ({ runId: String(ms), stage: 'Swap', at: new Date(ms).toISOString(), sha: 's' });
    expect(placeMarkers([mk(nowMs), mk(nowMs - WINDOW_MS), mk(nowMs + 1000)], nowMs).map((x) => x.x)).toEqual([0, 1]);
  });
  it('every signal row carries the same markers', () => {
    expect(new Set(rows.map((r) => r.markers.length))).toEqual(new Set([1]));
  });
});
