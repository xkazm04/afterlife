import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { HOME, type Cam } from './camera';
import { districtsOf } from './city';

const fleet = demoSource.getFleet();
const seed = fleet.projects.find((p) => p.state === 'watching')!;

/** groups x per synthetic projects, each a clone of one demo project. */
function synth(groups: number, per: number) {
  const names = Array.from({ length: groups }, (_, g) => `g${g}`);
  const projects = names.flatMap((group, g) => Array.from({ length: per }, (_, i) => ({ ...seed, id: `p${g}-${i}`, name: `p${g}-${i}`, group })));
  return districtsOf(names, projects);
}

/** The stage x the leftmost plate corner lands on under a camera. */
const leftOnStage = (ds: ReturnType<typeof synth>, c: Cam): number => c.X + c.k * (Math.min(...ds.map((d) => d.L[0])) - c.cx);

describe('the whole city fits the stage at L0', () => {
  it('keeps the demo where it is', () => {
    const ds = districtsOf(fleet.groups, fleet.projects);
    expect(leftOnStage(ds, HOME)).toBeGreaterThanOrEqual(278);
  });
  it.fails.each([[7, 50], [7, 100], [10, 26]])('a %i x %i fleet clears the answer column', (g, per) => {
    expect(leftOnStage(synth(g, per), HOME)).toBeGreaterThanOrEqual(278);
  });
});
