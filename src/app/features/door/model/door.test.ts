import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { HOME, cityTransform, frameDistrict, groundTransform } from './camera';
import { groundOf } from './ground';
import { districtsOf, paintOrder } from './city';
import { beamsOf, districtGlows, towerShape } from './shapes';
import { districtLine, fleetTotals, projectLine, topTiers } from './words';

const fleet = demoSource.getFleet();
const ds = districtsOf(fleet.groups, fleet.projects);

describe('the city', () => {
  it('places every project once, four districts in front and three behind', () => {
    expect(ds.reduce((a, d) => a + d.placed.length, 0)).toBe(fleet.projects.length);
    expect(ds.filter((d) => d.cy === 748)).toHaveLength(4);
    expect(ds.filter((d) => d.cy === 486)).toHaveLength(3);
    for (const d of ds) expect(new Set(d.placed.map((t) => `${t.i},${t.j}`)).size).toBe(d.placed.length);
  });
  it('paints back to front and puts the most decisions at the front', () => {
    const d = ds[0]!;
    const order = paintOrder(d);
    expect(order[0]!.i + order[0]!.j).toBeLessThanOrEqual(order[order.length - 1]!.i + order[order.length - 1]!.j);
    expect(d.placed[0]!.p.needsYou).toBe(Math.max(...d.placed.map((t) => t.p.needsYou)));
  });
  it('lights one beam per waiting project and a glow per district that waits', () => {
    const waiting = fleet.projects.filter((p) => p.state !== 'not-set-up' && p.needsYou > 0);
    expect(beamsOf(ds)).toHaveLength(waiting.length);
    expect(districtGlows(ds).length).toBe(ds.filter((d) => d.needs > 0).length);
  });
  it('draws a tower in about ten nodes: windows of a tier share a path', () => {
    const t = ds[0]!.placed.find((x) => x.p.state === 'watching')!;
    const s = towerShape(t, fleet.classes);
    expect(Object.keys(s.windows).length).toBeLessThanOrEqual(6);
    expect(s.faces).toBeDefined();
    const ghost = ds.flatMap((d) => d.placed).find((x) => x.p.state === 'not-set-up')!;
    expect(towerShape(ghost, fleet.classes).kind).toBe('nsu');
  });
  it('builds the ground as a handful of paths, the same every time', () => {
    const a = groundOf();
    expect(a).toEqual(groundOf());
    expect(a.pulses.length).toBeLessThanOrEqual(8);
    expect(a.vias.match(/M/g)!.length).toBe(340);
  });
});

describe('words and camera', () => {
  it('answers with the fleet counts', () => {
    expect(fleetTotals(fleet.projects)).toMatchObject({ n: 184, needs: 115, stale: 11, setup: 9, nsu: 9, watch: 155, quar: 25 });
    expect(topTiers(fleet.projects)[0]).toEqual({ n: 6, names: ['gateway-service', 'gateway-web'] });
  });
  it('says stale and unknown in words', () => {
    const stale = fleet.projects.find((p) => p.id === 'docs-portal')!;
    expect(projectLine(stale)[0]).toEqual(['stale · project token expired · last good poll 47 min ago', 'stale']);
    const nsu = fleet.projects.find((p) => p.state === 'not-set-up')!;
    expect(projectLine(nsu)).toEqual([['not watched · unknown, not zero', 'unknown']]);
    expect(districtLine(ds[0]!).map((p) => p[0]).join('')).toContain('decisions wait');
  });
  it('frames a district inside the stage and moves the ground at half speed', () => {
    const c = frameDistrict(ds[0]!);
    expect(c.k).toBeGreaterThan(1);
    expect(c.k).toBeLessThanOrEqual(3);
    expect(cityTransform(HOME)).toBe('translate(0.00px, 0.00px) scale(1.0000)');
    expect(groundTransform({ ...HOME, k: 3 })).toContain('scale(2.0000)');
  });
});
