import { describe, expect, it } from 'vitest';
import { shotAt } from './camera';
import { buildCity } from './city';
import { buildRoute, stationX, stationY } from './road';

describe('the road', () => {
  const r = buildRoute(9);

  it('passes through every station, in order along the road', () => {
    r.stationLen.forEach((len, i) => {
      const p = r.pointAt(len);
      expect(p.x).toBeCloseTo(stationX(i), 0);
      expect(p.y).toBeCloseTo(stationY(i), 0);
      if (i) expect(len).toBeGreaterThan(r.stationLen[i - 1]!);
    });
  });

  it('maps beat positions to lengths, clamped to the road', () => {
    expect(r.lenAt(4)).toBeCloseTo(r.stationLen[4]!);
    expect(r.lenAt(4.5)).toBeCloseTo((r.stationLen[4]! + r.stationLen[5]!) / 2);
    expect(r.lenAt(-100)).toBe(0);
    expect(r.lenAt(100)).toBe(r.total);
  });

  it('draws one road for any number of beats, with no NaN', () => {
    for (const n of [0, 1, 2, 12]) {
      const q = buildRoute(n);
      expect(q.stations).toHaveLength(n);
      expect(q.d).not.toMatch(/NaN|Infinity|undefined/);
      expect(Number.isFinite(q.lenAt(0.5))).toBe(true);
    }
  });

  it('frames a shot with finite transforms, the light on the road', () => {
    const sh = shotAt(r, { t: 3, z: 1 }, 1000, true);
    expect(Object.values(sh.layers).join(' ')).not.toMatch(/NaN|Infinity/);
    expect(sh.trail).toBeCloseTo(r.stationLen[3]!);
    expect(sh.token).toBe(`translate(${stationX(3).toFixed(1)} ${stationY(3).toFixed(1)}) scale(1.00)`);
  });
});

describe('the city', () => {
  it('is the same night every time (a fixed seed: the server and the browser agree)', () => {
    expect(buildCity()).toEqual(buildCity());
    expect(buildCity().far.front.length).toBeGreaterThan(1000);
  });
});
