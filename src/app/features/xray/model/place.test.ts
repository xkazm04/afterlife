import { describe, expect, it } from 'vitest';
import { clip, leader, placeCard } from './place';

const area = { x: 0, y: 0, w: 1000, h: 800 };
const card = { w: 300, h: 120 };

describe('placeCard', () => {
  it('puts the card right of a small target when it fits', () => {
    const b = placeCard({ x: 100, y: 100, w: 80, h: 30 }, card, area, null);
    expect(b.x).toBe(198);
  });
  it('goes left when the right side runs out', () => {
    const b = placeCard({ x: 800, y: 100, w: 150, h: 30 }, card, area, null);
    expect(b.x + b.w).toBeLessThanOrEqual(800);
  });
  it('keeps clear of the docked panel', () => {
    const avoid = { x: 650, y: 400, w: 340, h: 380 };
    const b = placeCard({ x: 400, y: 500, w: 200, h: 40 }, card, area, avoid);
    expect(b.x + b.w <= avoid.x || b.y + b.h <= avoid.y).toBe(true);
  });
  it('slides a wide card left of the panel when a header row spans the window', () => {
    const avoid = { x: 650, y: 400, w: 340, h: 380 };
    const wide = { w: 460, h: 300 };
    const b = placeCard({ x: 0, y: 60, w: 1000, h: 30 }, wide, area, avoid);
    expect(b.x + b.w <= avoid.x || b.y + b.h <= avoid.y).toBe(true);
    expect(b.y).toBeGreaterThan(90);
  });
  it('labels a table from inside its own corner', () => {
    const b = placeCard({ x: 0, y: 50, w: 1000, h: 750 }, card, area, null);
    expect(b.x).toBeGreaterThan(500);
    expect(b.y).toBeGreaterThan(50);
  });
  it("keeps a big target's card clear of the docked panel (Setup: the map under the panel)", () => {
    const avoid = { x: 650, y: 420, w: 340, h: 370 };
    const b = placeCard({ x: 0, y: 220, w: 1000, h: 580 }, { w: 460, h: 300 }, area, avoid);
    expect(b.x + b.w <= avoid.x || b.y + b.h <= avoid.y).toBe(true);
    expect(b.x >= 0 && b.y >= 220).toBe(true);
  });
  it("leaves a big target's card in its top-right corner when the panel is clear of it (Fleet)", () => {
    const avoid = { x: 650, y: 420, w: 340, h: 370 };
    const b = placeCard({ x: 0, y: 50, w: 1000, h: 750 }, card, area, avoid);
    expect(b).toEqual({ x: 1000 - 300 - 54, y: 104, w: 300, h: 120 });
  });
  it('always stays inside the area', () => {
    const b = placeCard({ x: 0, y: 0, w: 990, h: 20 }, card, area, null);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y + b.h).toBeLessThanOrEqual(800);
  });
});

describe('clip and leader', () => {
  it('clips a tall table to the area and drops what does not show', () => {
    expect(clip({ x: 10, y: 700, w: 100, h: 900 }, area)).toEqual({ x: 10, y: 700, w: 100, h: 100 });
    expect(clip({ x: 10, y: 900, w: 100, h: 20 }, area)).toBeNull();
  });
  it('runs from the card edge to the target edge', () => {
    expect(leader({ x: 300, y: 100, w: 100, h: 40 }, { x: 100, y: 100, w: 50, h: 40 })).toEqual({ x1: 300, y1: 120, x2: 150, y2: 120 });
  });
});
