import { describe, expect, it } from 'vitest';
import type { ActorKind, LedgerEntry } from '../types';
import { timedEntries } from './moves';
import { layoutAxis } from './timeline';

/** An entry at a UTC instant, labelled as the screen labels it in UTC. */
const ev = (iso: string, actor: string, kind: ActorKind): LedgerEntry => ({ at: Date.parse(iso), t: iso.slice(11, 19), ids: ['patch-bump'], actor, where: '', kind, text: '' });
const day = (hms: string) => `2026-10-06T${hms}Z`;
const patchBump = [ev(day('14:20:03'), 'guardrail job', 'gitlab'), ev(day('14:20:05'), 'tripwire job', 'gitlab'), ev(day('14:20:17'), 'Afterlife', 'afterlife')];

describe('layoutAxis', () => {
  it('places events to scale between 4 % and 96 %', () => {
    const a = layoutAxis(patchBump);
    expect(a.span).toBe(14);
    expect(a.points.map((p) => Math.round(p.x * 10) / 10)).toEqual([4, 17.1, 96]);
  });
  it('draws the gap before the first Afterlife poll and says how late it was', () => {
    const { gap } = layoutAxis(patchBump);
    expect(gap?.label).toBe('Afterlife 12 s late');
    expect(gap?.left).toBeCloseTo(17.14, 1);
    expect((gap?.left ?? 0) + (gap?.width ?? 0)).toBeCloseTo(96, 5);
    expect(gap?.mid).toBeCloseTo(((gap?.left ?? 0) * 2 + (gap?.width ?? 0)) / 2, 5);
  });
  it('labels with minutes, seconds and the first word of the actor, alternating rows', () => {
    const a = layoutAxis(patchBump);
    expect(a.points.map((p) => p.label)).toEqual(['20:03 guardrail', '20:05 tripwire', '20:17 Afterlife']);
    expect(a.points.map((p) => p.row)).toEqual([1, 2, 1]);
    expect(a.points.map((p) => p.edge)).toEqual(['first', null, 'last']);
  });
  it('has no gap without a Afterlife poll, or when the poll is the first event', () => {
    expect(layoutAxis([ev(day('14:00:00'), 'you', 'you'), ev(day('14:00:06'), 'tier-gate job', 'gitlab')]).gap).toBeNull();
    expect(layoutAxis([ev(day('14:00:00'), 'Afterlife', 'afterlife'), ev(day('14:00:06'), 'you', 'you')]).gap).toBeNull();
  });
  it('keeps events in order across midnight (live entries are clock times within the last 24 h)', () => {
    const a = layoutAxis([ev('2026-10-15T23:59:58Z', 'tier-gate job', 'gitlab'), ev('2026-10-16T00:00:03Z', 'Afterlife', 'afterlife')]);
    expect(a.span).toBe(5);
    expect(a.points.map((p) => p.x)).toEqual([4, 96]);
    expect(a.gap?.label).toBe('Afterlife 5 s late');
  });
  it('a few seconds of clock skew backwards is not a new day', () => {
    const a = layoutAxis([ev(day('14:00:05'), 'a', 'gitlab'), ev(day('14:00:03'), 'b', 'gitlab'), ev(day('14:00:10'), 'c', 'gitlab')]);
    expect(a.span).toBe(7);
  });
  it('never divides by zero when everything happened in the same second', () => {
    const a = layoutAxis([ev(day('14:00:00'), 'a', 'you'), ev(day('14:00:00'), 'b', 'you')]);
    expect(a.span).toBe(1);
    expect(a.points.every((p) => p.x === 4)).toBe(true);
  });
});

describe('layoutAxis across midnight: placed by the instant, not the time of day', () => {
  it('23:58 then 00:02 is 240 s apart, oldest left', () => {
    const a = layoutAxis([ev('2026-10-15T23:58:00Z', 'guardrail job', 'gitlab'), ev('2026-10-16T00:02:00Z', 'you', 'you')]);
    expect(a.span).toBe(240);
    expect(a.points.map((p) => p.x)).toEqual([4, 96]);
  });
  it('a Afterlife poll 12 s after a job, over midnight, is 12 s late', () => {
    const { gap } = layoutAxis([ev('2026-10-15T23:59:55Z', 'guardrail job', 'gitlab'), ev('2026-10-16T00:00:07Z', 'Afterlife', 'afterlife')]);
    expect(gap?.label).toBe('Afterlife 12 s late');
    expect(gap?.width).toBeGreaterThan(0);
  });
  it('orders by instant whatever order the entries came in', () => {
    const a = layoutAxis([ev('2026-10-16T00:02:00Z', 'you', 'you'), ev('2026-10-15T23:58:00Z', 'guardrail job', 'gitlab')]);
    expect(a.points.map((p) => [p.x, p.label])).toEqual([[4, '58:00 guardrail'], [96, '02:00 you']]);
  });
  it('labels with the hour and words the lag by its size when the rail spans hours', () => {
    const a = layoutAxis([ev(day('09:20:03'), 'guardrail job', 'gitlab'), ev(day('17:20:03'), 'tripwire job', 'gitlab'), ev(day('18:20:03'), 'Afterlife', 'afterlife')]);
    expect(a.points.map((p) => p.label)).toEqual(['09:20 guardrail', '17:20 tripwire', '18:20 Afterlife']);
    expect(a.gap?.label).toBe('Afterlife 1 h late');
  });
});

describe('timedEntries', () => {
  it('keeps the clock-labelled entries within a day of the newest, by instant', () => {
    const old = ev('2026-10-14T23:00:00Z', 'proof job', 'gitlab');
    const aged = { ...ev('2026-10-10T12:00:00Z', 'a person', 'person'), t: '5 d ago' };
    const kept = [ev('2026-10-15T23:58:00Z', 'guardrail job', 'gitlab'), ev('2026-10-16T00:02:00Z', 'you', 'you')];
    expect(timedEntries([aged, old, ...kept])).toEqual(kept);
    expect(timedEntries([aged])).toEqual([]);
  });
});
