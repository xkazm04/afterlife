// Stability arithmetic: the median, a red rate only over final pipelines (null when none), reverts, and the group sum.
import { describe, expect, it } from 'vitest';
import { foldStability, groupRed, median, type MrFact } from './stability';

const f = (size: number | null, pipeline: MrFact['pipeline'], reverted = false): MrFact => ({ size, pipeline, reverted });

describe('median', () => {
  it('odd, even and empty', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([40, 10, 20, 30])).toBe(25);
    expect(median([])).toBeNull();
  });
});

describe('foldStability', () => {
  it('counts every MR, takes the median of the sizes read, and the red rate over the final pipelines only', () => {
    const s = foldStability([f(10, 'success'), f(50, 'failed'), f(null, 'running'), f(30, 'canceled'), f(20, null, true)]);
    expect(s).toEqual({ n: 5, medianSize: 25, redRate: 1 / 3, failed: 1, finals: 3, reverts: 1 });
  });
  it('no final pipeline: red rate null, not 0; no size read: median null', () => {
    expect(foldStability([f(null, 'running'), f(null, null)])).toMatchObject({ n: 2, medianSize: null, redRate: null, finals: 0 });
  });
  it('no MRs: n 0 and every rate unknown', () => {
    expect(foldStability([])).toEqual({ n: 0, medianSize: null, redRate: null, failed: 0, finals: 0, reverts: 0 });
  });
});

describe('groupRed', () => {
  it('sums failed and finals over the projects read', () => {
    const a = foldStability([f(1, 'failed'), f(1, 'success')]);
    const b = foldStability([f(1, 'success'), f(1, 'success')]);
    expect(groupRed([a, b, undefined])).toEqual({ failed: 1, finals: 4, redRate: 0.25, read: 2 });
  });
  it('none read: null; read but no final pipeline: rate null', () => {
    expect(groupRed([undefined])).toBeNull();
    expect(groupRed([foldStability([f(1, 'running')])])?.redRate).toBeNull();
  });
});
