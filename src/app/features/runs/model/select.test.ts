import { describe, expect, it } from 'vitest';
import { laneId, waveId, waveOfId } from './select';
import { lane, repo, wave } from './wave.fixture';

const w1 = wave('alpha', 1, { lanes: [lane('fix-a')] });
const w12 = wave('alpha', 12, { lanes: [lane('fix-b')] });
const repos = [repo('alpha', [w12, w1])];

describe('what a selection id names', () => {
  it('a wave id is its wave; a group or nothing is no wave', () => {
    expect(waveOfId(repos, waveId(w1))).toBe(w1);
    expect(waveOfId(repos, 'g:alpha')).toBeUndefined();
    expect(waveOfId(repos, null)).toBeUndefined();
  });

  it("a lane id is its wave, and wave 1's prefix never matches wave 12's lanes", () => {
    expect(waveOfId(repos, laneId(w1, w1.lanes[0]!))).toBe(w1);
    expect(waveOfId(repos, laneId(w12, w12.lanes[0]!))).toBe(w12);
    expect(waveOfId(repos, 'l:alpha:1:nope')).toBeUndefined();
  });
});
