// The verdict's rules (bench-delta's, over medians): credited only beyond the tolerance in the claimed direction,
// not-earned within it or worse, inconclusive with too few wall-time samples or a noisy side.
import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_TOLERANCE, DEFAULT_TOLERANCE } from '../../../../../engine/proofs/checkers/benchDelta';
import { judge } from '../../index';
import { judgeSamples, sampleOf } from '../judge';

const BASE = [44, 44.5, 43.8, 44.2, 44.1];

describe('judge', () => {
  it('credits a stage that got faster beyond the tolerance (direction down)', () => {
    const j = judge(BASE, [38.2, 38.5, 38.0], 'down');
    expect(j.verdict).toBe('credited');
    expect(j.tolerance).toBe(DEFAULT_TOLERANCE);
    expect(j.base).toEqual({ n: 5, median: 44.1, spread: 0.02 });
    expect(j.head.median).toBe(38.2);
    expect(j.reason).toMatch(/head median 38.2 vs base 44.1, -13%/);
  });

  it('does not credit a move within the tolerance, nor one the wrong way', () => {
    expect(judge(BASE, [43, 43.2, 42.9], 'down').verdict).toBe('not-earned');
    const worse = judge(BASE, [50, 50.5, 49.8], 'down');
    expect(worse.verdict).toBe('not-earned');
    expect(worse.reason).toMatch(/worse/);
  });

  it('direction up credits a rise and refuses a fall', () => {
    expect(judge([100, 101, 99], [120, 121, 119], 'up').verdict).toBe('credited');
    expect(judge([100, 101, 99], [80, 81, 79], 'up').verdict).toBe('not-earned');
    expect(judge([100, 101, 99], [80, 81, 79], 'down').verdict).toBe('credited');
  });

  it('is inconclusive with fewer than 3 samples on either side of a wall-time target', () => {
    expect(judge([44, 44], [30, 30, 30], 'down').verdict).toBe('inconclusive');
    const j = judge(BASE, [30], 'down');
    expect(j.verdict).toBe('inconclusive');
    expect(j.reason).toMatch(/too few samples: 5 base \/ 1 head/);
    // a local metric read once a side is not held to the wall floor
    expect(judgeSamples([200], [150], { direction: 'down', wall: false }).verdict).toBe('credited');
  });

  it('is inconclusive when a side spreads more than twice the tolerance (noisy)', () => {
    const j = judge(BASE, [30, 38, 41], 'down'); // spread (41-30)/38 = 0.29 > 0.10
    expect(j.verdict).toBe('inconclusive');
    expect(j.reason).toMatch(/^noisy/);
    expect(judge([30, 44, 50], [20, 20, 20], 'down').verdict).toBe('inconclusive');
  });

  it('caps the tolerance at the bench-delta ceiling and falls back to the default', () => {
    expect(judge(BASE, [38, 38, 38], 'down', 0.5).tolerance).toBe(DEFAULT_MAX_TOLERANCE);
    expect(judge(BASE, [38, 38, 38], 'down', -1).tolerance).toBe(DEFAULT_TOLERANCE);
    expect(judge(BASE, [41, 41, 41], 'down', 0.1).verdict).toBe('not-earned'); // -7% inside a 10% tolerance
  });

  it('a sample is n, median and spread; an empty side is n 0', () => {
    expect(sampleOf([3, 1, 2])).toEqual({ n: 3, median: 2, spread: 1 });
    expect(sampleOf([5])).toEqual({ n: 1, median: 5, spread: 0 });
    expect(sampleOf([])).toEqual({ n: 0, median: 0, spread: 0 });
  });
});
