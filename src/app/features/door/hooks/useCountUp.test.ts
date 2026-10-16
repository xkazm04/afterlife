// useCountUp stops its frame loop once the intro is over: the value is discarded then, so nothing may keep setting state.
// No DOM environment here, so react is replaced by a minimal hook runtime and the frame clock is driven by hand.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rt = vi.hoisted(() => ({
  slots: [] as unknown[],
  deps: [] as (unknown[] | undefined)[],
  cleanups: [] as ((() => void) | undefined)[],
  pending: [] as (() => void)[],
  idx: 0,
  sets: 0,
  frames: new Map<number, (t: number) => void>(),
  nextFrame: 1,
  now: 0,
}));

vi.mock('react', () => ({
  useState: (init: unknown) => {
    const i = rt.idx++;
    if (!(i in rt.slots)) rt.slots[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [rt.slots[i], (v: unknown) => { rt.slots[i] = v; rt.sets++; }];
  },
  useEffect: (fn: () => void | (() => void), deps: unknown[]) => {
    const i = rt.idx++;
    const prev = rt.deps[i];
    rt.deps[i] = deps;
    if (prev && prev.length === deps.length && prev.every((d, k) => Object.is(d, deps[k]))) return;
    rt.pending.push(() => { rt.cleanups[i]?.(); rt.cleanups[i] = fn() as (() => void) | undefined; });
  },
}));

import { useCountUp } from './useCountUp';

const Render = (intro: boolean) => {
  rt.idx = 0;
  const out = useCountUp(115, 1200, 2000, intro);
  rt.pending.splice(0).forEach((run) => run());
  return out;
};
/** Runs the frames up to `ms`, 16 ms apart, and returns how many state sets they made. */
const advance = (ms: number) => {
  const before = rt.sets;
  for (; rt.now < ms; rt.now += 16) for (const [id, cb] of [...rt.frames]) { rt.frames.delete(id); cb(rt.now); }
  return rt.sets - before;
};
const mount = () => { rt.cleanups.forEach((c) => c?.()); rt.slots = []; rt.deps = []; rt.cleanups = []; rt.frames.clear(); };

beforeEach(() => {
  rt.slots = []; rt.deps = []; rt.cleanups = []; rt.pending = []; rt.sets = 0; rt.frames.clear(); rt.now = 0;
  vi.stubGlobal('performance', { now: () => 0 });
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { const id = rt.nextFrame++; rt.frames.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { rt.frames.delete(id); });
});

describe('useCountUp after the first door of a page load', () => {
  const secondMount = () => { Render(true); mount(); };

  it('counts while the intro runs', () => {
    secondMount();
    Render(true);
    expect(advance(160)).toBeGreaterThan(0);
  });

  it('stops setting state the moment the intro ends, and shows the final number', () => {
    secondMount();
    Render(true);
    advance(300);
    expect(Render(false)).toBe(115);
    expect(advance(3400)).toBe(0);
  });
});
