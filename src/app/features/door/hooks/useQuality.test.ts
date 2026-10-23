// The render-tier probe: a machine too slow to give eight frames in the window is the slowest there is, so it is lite,
// while a probe the page left mid-way (hidden tab, suspended laptop) measures nothing and decides nothing.
// No DOM environment here: react's effect runs at once and the frame clock is driven by hand.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', () => ({ useEffect: (fn: () => void) => void fn() }));

import { useQuality } from './useQuality';

let frame: ((t: number) => void) | null = null;
let dataset: Record<string, string> = {};
const stored = new Map<string, string>();

beforeEach(() => {
  frame = null;
  dataset = {};
  stored.clear();
  vi.stubGlobal('performance', { now: () => 0 });
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => ((frame = cb), 1));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('document', { hidden: false, documentElement: { dataset } });
  vi.stubGlobal('localStorage', { setItem: (k: string, v: string) => stored.set(k, v) });
});

/** Drives the started probe through frames at the given times (ms) and returns the tier it set, if any. */
const drive = (times: number[]) => {
  for (const t of times) {
    const f = frame;
    frame = null;
    f?.(t);
  }
  return dataset.doorQ;
};
const every = (ms: number, until: number) => Array.from({ length: Math.ceil(until / ms) }, (_, i) => (i + 1) * ms);

describe('useQuality', () => {
  it('a 60 fps machine stays full', () => {
    useQuality();
    expect(drive(every(16, 2200))).toBe('full');
  });
  it('a 4 fps machine (six frames in the window) is lite', () => {
    useQuality();
    expect(drive(every(250, 2500))).toBe('lite');
    expect(stored.get('afterlife.doorQuality')).toBe('lite');
  });
  it('a probe the page left mid-way decides nothing', () => {
    useQuality();
    expect(drive([416, 432, 9000, 9016, 9032])).toBeUndefined(); // two real frames, then the tab came back
    expect(stored.size).toBe(0);
  });
});
