import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// No DOM environment here: React is reduced to the two hooks the geometry hook uses, and the canvas, the observers and the
// window are stubs. The hook is then run as a plain function and its effect is run by hand.
const h = vi.hoisted(() => ({ effect: null as null | (() => void | (() => void)), state: null as unknown }));
vi.mock('react', () => ({
  useEffect: (fn: () => void | (() => void)) => {
    h.effect = fn;
  },
  useState: (init: unknown) => [h.state ?? init, (v: unknown) => { h.state = typeof v === 'function' ? (v as (p: unknown) => unknown)(h.state ?? init) : v; }],
}));

import { useEdgeGeometry, type Measured } from './useEdgeGeometry';

interface Rect { top: number; left: number; right: number; height: number }
const rect = (top: number): Rect => ({ top, left: 0, right: 100, height: 10 });
const node = (key: string, top: number) => ({ dataset: { node: key }, getBoundingClientRect: () => rect(top) });

let observed: unknown[];
let roCallback: (() => void) | null;
let moCallback: (() => void) | null;

beforeEach(() => {
  h.effect = null;
  h.state = null;
  observed = [];
  roCallback = null;
  moCallback = null;
  vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '1' }));
  vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { roCallback = cb; } observe(el: unknown) { observed.push(el); } disconnect() {} });
  vi.stubGlobal('MutationObserver', class { constructor(cb: () => void) { moCallback = cb; } observe() {} disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());

function useMount(nodes: ReturnType<typeof node>[]) {
  const cv = { getBoundingClientRect: () => rect(0), querySelectorAll: () => nodes };
  useEdgeGeometry({ current: cv as unknown as HTMLElement });
  h.effect?.();
  return { cv, nodes };
}
const caps = () => Object.keys((h.state as Measured | null)?.geom.caps ?? {}).length;

describe('useEdgeGeometry', () => {
  it('measures the nodes present at mount', () => {
    useMount([node('cap:a', 0)]);
    roCallback?.();
    expect(caps()).toBe(1);
  });

  it('observes and measures a node added after mount (a re-probe that returns more doctor rows)', () => {
    const { nodes } = useMount([node('cap:a', 0)]);
    for (let i = 0; i < 8; i++) nodes.push(node(`cap:n${i}`, 20 * i));
    moCallback?.();
    roCallback?.();
    expect(nodes.every((n) => observed.includes(n))).toBe(true);
    expect(caps()).toBe(9);
  });

  it('does nothing, and does not throw, where ResizeObserver is missing', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    expect(() => useMount([node('cap:a', 0)])).not.toThrow();
  });
});
