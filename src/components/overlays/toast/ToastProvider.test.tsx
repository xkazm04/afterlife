import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Plain-node vitest cannot mount the provider, so React's hooks are replaced by a tiny re-render harness: each render()
// calls ToastProvider again with the state the previous call left, the way React would after a setState.
const cells: unknown[] = [];
let at = 0;
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  useState: (init: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [cells[i], (v: unknown) => (cells[i] = typeof v === 'function' ? (v as (p: unknown) => unknown)(cells[i]) : v)];
  },
  useRef: (init: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = { current: init };
    return cells[i];
  },
  useEffect: () => {},
  useCallback: (fn: unknown) => fn,
  useMemo: (fn: () => unknown) => fn(),
}));

const { ToastProvider } = await import('./ToastProvider');
type Api = { toast: (m: string) => void };

const render = (): ReactElement<{ value: Api; children: [ReactNode, ReactElement<{ children: ReactNode }>] }> => {
  at = 0;
  return ToastProvider({ children: null }) as never;
};
/** What a screen reader's live region holds: the identity of the node carrying the text (a changed key replaces the node) and the text. */
const region = () => {
  const child = render().props.children[1].props.children as ReactNode;
  if (child !== null && typeof child === 'object' && 'props' in child) {
    const el = child as ReactElement<{ children: ReactNode }>;
    return `${String(el.key)}|${String(el.props.children)}`;
  }
  return `-|${String(child)}`;
};
/** Calls toast(m) once per entry and counts how many calls changed what the polite live region holds. */
const mutations = (calls: string[]) => {
  let n = 0;
  let last = region();
  for (const m of calls) {
    render().props.value.toast(m);
    const now = region();
    if (now !== last) n++;
    last = now;
  }
  return n;
};

beforeEach(() => {
  cells.length = 0;
  vi.useFakeTimers();
});

describe('ToastProvider live region', () => {
  it.fails('replaces the announced node on every toast, even for the same words', () => {
    expect(mutations(['Copied x', 'Copied x'])).toBe(2);
  });
  it('announces two different toasts as two changes', () => {
    expect(mutations(['Copied x', 'Copied y'])).toBe(2);
  });
  it('does not replace the node when the toast clears, so the clear is not announced a second time', () => {
    render().props.value.toast('Copied x');
    const shown = region().split('|')[0];
    vi.advanceTimersByTime(3000);
    expect(region()).toBe(`${shown}|`);
  });
});
