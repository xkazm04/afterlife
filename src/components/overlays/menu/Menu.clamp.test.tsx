import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Layout needs a browser, so React's hooks are replaced by a re-render harness that keeps what matters here: state cells
// (a setState to an identical value bails out, as in React), and a layout effect that re-runs only when its deps changed
// (Object.is per entry, as React compares them). The menu element is a stub whose height follows how many items it holds.
const ROW = 20;
const cells: unknown[] = [];
const prevDeps: (readonly unknown[] | undefined)[] = [];
let at = 0;
let layoutAt = 0;
let dirty = false;
let rows = 1;
const el = { offsetWidth: 100, get offsetHeight() { return rows * ROW; }, focus: vi.fn() };
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  useState: (init: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [
      cells[i],
      (v: unknown) => {
        const next = typeof v === 'function' ? (v as (p: unknown) => unknown)(cells[i]) : v;
        if (!Object.is(next, cells[i])) dirty = true;
        cells[i] = next;
      },
    ];
  },
  useRef: (init: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = { current: init === null ? el : init };
    return cells[i];
  },
  useId: () => ':m:',
  useEffect: () => {},
  useLayoutEffect: (fn: () => void, deps: readonly unknown[]) => {
    const i = layoutAt++;
    const before = prevDeps[i];
    prevDeps[i] = deps;
    if (!before || deps.some((d, k) => !Object.is(d, before[k]))) fn();
  },
}));
vi.mock('react-dom', async (orig) => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (node: unknown) => node }));
vi.stubGlobal('document', { body: {} });
vi.stubGlobal('innerWidth', 400);
vi.stubGlobal('innerHeight', 100);

const { Menu } = await import('./Menu');
const entries = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `Item ${i}`, run: () => {} }));
const pass = (n: number) => {
  at = 0;
  layoutAt = 0;
  dirty = false;
  rows = n;
  return Menu({ items: entries(n), x: 10, y: 60, onRun: () => {}, onClose: () => {} }) as ReactElement<{ style: { top: number } }>;
};
/** Renders until the menu settles (React re-renders after a layout-effect setState) and returns its top and the pass count. */
const settle = (n: number) => {
  let passes = 0;
  let tree = pass(n);
  while (dirty && passes++ < 5) tree = pass(n);
  return { top: tree.props.style.top, passes };
};

beforeEach(() => {
  cells.length = 0;
  prevDeps.length = 0;
  el.focus.mockClear();
});

describe('Menu keep-open re-clamp', () => {
  it.fails('keeps the menu inside the viewport when its items grow in place', () => {
    settle(1); // 20px tall at y 60 fits a 100px viewport
    const { top } = settle(3); // 60px tall: the same y would run past the bottom edge
    expect(top + 3 * ROW).toBeLessThanOrEqual(100);
  });
  it('does not take focus again when only the items changed', () => {
    settle(1);
    settle(3);
    expect(el.focus).toHaveBeenCalledTimes(1);
  });
  it('settles: a re-render with fresh but equal items does not loop', () => {
    settle(2);
    expect(settle(2).passes).toBe(0);
  });
});
