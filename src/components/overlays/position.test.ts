import { describe, expect, it } from 'vitest';
import { clampToViewport, placeNear } from './position';

const vp = { w: 1000, h: 700 };

describe('clampToViewport', () => {
  it('leaves a fitting box alone', () => {
    expect(clampToViewport({ x: 100, y: 120 }, { w: 200, h: 100 }, vp)).toEqual({ x: 100, y: 120 });
  });
  it('pulls a box back inside every edge', () => {
    expect(clampToViewport({ x: 950, y: 690 }, { w: 200, h: 100 }, vp)).toEqual({ x: 796, y: 596 });
    expect(clampToViewport({ x: -30, y: -9 }, { w: 200, h: 100 }, vp)).toEqual({ x: 4, y: 4 });
  });
});

describe('placeNear', () => {
  const anchor = { left: 400, top: 100, right: 440, bottom: 126 };
  it('goes below and centres on the anchor', () => {
    expect(placeNear(anchor, { w: 100, h: 80 }, vp)).toEqual({ x: 370, y: 132 });
  });
  it('flips above when below would overflow', () => {
    const low = { left: 400, top: 650, right: 440, bottom: 676 };
    expect(placeNear(low, { w: 100, h: 80 }, vp).y).toBe(650 - 80 - 6);
  });
  it('prefers above, and flips below when there is no room', () => {
    expect(placeNear({ left: 10, top: 600, right: 40, bottom: 622 }, { w: 100, h: 80 }, vp, 'above').y).toBe(600 - 86);
    expect(placeNear(anchor, { w: 100, h: 200 }, vp, 'above').y).toBe(132);
  });
  it('clamps horizontally', () => {
    expect(placeNear({ left: 0, top: 100, right: 20, bottom: 120 }, { w: 300, h: 50 }, vp).x).toBe(6);
  });
});
