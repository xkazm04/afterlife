import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Focus needs a browser, so React's hooks are replaced by a small harness: state cells (a setState to a different value
// marks the component dirty, as a re-render), refs, and effects that are collected and run after a pass. `window` and
// `document` are stubs, so the test sets whether the document has focus and fires focus/blur at whatever listened.
type Fn = () => void | (() => void);
let cells: unknown[] = [];
let at = 0;
let effects: Fn[] = [];
let dirty = false;
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
    if (!(i in cells)) cells[i] = { current: init };
    return cells[i];
  },
  useEffect: (fn: Fn) => void effects.push(fn),
  useContext: (c: { _currentValue: unknown }) => c._currentValue, // the default: no provider in a bare call
  useMemo: (f: () => unknown) => f(),
  useId: () => ':r0:',
  ViewTransition: undefined, // plain React has none; frame/Motion then renders its children as they are
  useSyncExternalStore: (subscribe: (n: () => void) => () => void, get: () => unknown) => {
    effects.push(() => subscribe(() => void (dirty = true)));
    return get();
  },
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/ladder' }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: () => null }));

let hasFocus = true;
const listeners: Record<string, (() => void)[]> = {};
vi.stubGlobal('document', { hasFocus: () => hasFocus, addEventListener: () => {}, removeEventListener: () => {} });
vi.stubGlobal('window', {
  addEventListener: (t: string, f: () => void) => void (listeners[t] ??= []).push(f),
  removeEventListener: () => {},
});

const { Window } = await import('./Window');
const { AppFrame } = await import('./frame/AppFrame');
const { TrafficLights } = await import('./sidebar/TrafficLights');

const pass = <P extends object>(c: (p: P) => unknown, p: P) => {
  at = 0;
  effects = [];
  dirty = false;
  return c(p) as ReactElement<{ className?: string }>;
};
const fire = (type: 'focus' | 'blur') => listeners[type]?.forEach((f) => f());

beforeEach(() => {
  cells = [];
  hasFocus = true;
  for (const k of Object.keys(listeners)) delete listeners[k];
});

describe('window focus and the traffic lights', () => {
  // The lights' class carries `inactive` only when unfocused; CSS modules give different strings for the two states.
  it('draws the lights inactive on mount when the document has no focus', () => {
    hasFocus = false;
    pass(TrafficLights, {});
    effects.forEach((e) => e());
    const mounted = pass(TrafficLights, {});
    hasFocus = true;
    cells = [];
    const focused = pass(TrafficLights, {});
    effects.forEach((e) => e());
    expect(mounted.props.className).not.toBe(focused.props.className);
  });

  it('greys and relights the lights on blur and focus', () => {
    const cls = () => pass(TrafficLights, {}).props.className;
    pass(TrafficLights, {});
    effects.forEach((e) => e());
    const lit = cls();
    hasFocus = false;
    fire('blur');
    expect(dirty).toBe(true);
    expect(cls()).not.toBe(lit);
    hasFocus = true;
    fire('focus');
    expect(cls()).toBe(lit);
  });

  it('keeps the focus state out of Window and its frame, so a blur does not re-render the chrome', () => {
    pass(Window, { title: 'x' });
    effects.forEach((e) => e());
    pass(AppFrame, {});
    effects.forEach((e) => e());
    dirty = false;
    fire('blur');
    fire('focus');
    fire('blur');
    expect(dirty).toBe(false);
  });
});
