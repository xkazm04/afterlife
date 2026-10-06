import { describe, expect, it } from 'vitest';
import type { ActorKind, LedgerEntry } from '../types';
import { layoutAxis } from './timeline';

const ev = (t: string, actor: string, kind: ActorKind): LedgerEntry => ({ t, ids: ['patch-bump'], actor, where: '', kind, text: '' });
const patchBump = [ev('14:20:03', 'guardrail job', 'gitlab'), ev('14:20:05', 'tripwire job', 'gitlab'), ev('14:20:17', 'Belay', 'belay')];

describe('layoutAxis', () => {
  it('places events to scale between 4 % and 96 %', () => {
    const a = layoutAxis(patchBump);
    expect(a.span).toBe(14);
    expect(a.points.map((p) => Math.round(p.x * 10) / 10)).toEqual([4, 17.1, 96]);
  });
  it('draws the gap before the first Belay poll and says how late it was', () => {
    const { gap } = layoutAxis(patchBump);
    expect(gap?.label).toBe('Belay 12 s late');
    expect(gap?.left).toBeCloseTo(17.14, 1);
    expect((gap?.left ?? 0) + (gap?.width ?? 0)).toBeCloseTo(96, 5);
    expect(gap?.mid).toBeCloseTo(((gap?.left ?? 0) * 2 + (gap?.width ?? 0)) / 2, 5);
  });
  it('labels with minutes, seconds and the first word of the actor, alternating rows', () => {
    const a = layoutAxis(patchBump);
    expect(a.points.map((p) => p.label)).toEqual(['20:03 guardrail', '20:05 tripwire', '20:17 Belay']);
    expect(a.points.map((p) => p.row)).toEqual([1, 2, 1]);
    expect(a.points.map((p) => p.edge)).toEqual(['first', null, 'last']);
  });
  it('has no gap without a Belay poll, or when the poll is the first event', () => {
    expect(layoutAxis([ev('14:00:00', 'you', 'you'), ev('14:00:06', 'tier-gate job', 'gitlab')]).gap).toBeNull();
    expect(layoutAxis([ev('14:00:00', 'Belay', 'belay'), ev('14:00:06', 'you', 'you')]).gap).toBeNull();
  });
  it('never divides by zero when everything happened in the same second', () => {
    const a = layoutAxis([ev('14:00:00', 'a', 'you'), ev('14:00:00', 'b', 'you')]);
    expect(a.span).toBe(1);
    expect(a.points.every((p) => p.x === 4)).toBe(true);
  });
});
