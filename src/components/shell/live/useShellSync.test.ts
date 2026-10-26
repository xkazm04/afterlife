// useShellSync's triggers: a router route change reads nothing (a server action's refresh() re-renders the layout with a
// fresh read), regained focus reads /api/shell once, a screen's ask (requestShellRead) reads, and a new server prop is
// adopted at once. The screen host's navigations are hostNav.test.ts. There is no browser here, so React's hooks are a small harness: state and ref cells, and effects
// that run when their deps change between passes, as React runs them.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellInfo } from '../ShellContext';

type Fn = () => void | (() => void);
let cells: unknown[] = [];
let at = 0;
let due: Fn[] = [];
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  useState: (init: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [cells[i], (v: unknown) => void (cells[i] = v)];
  },
  useRef: (init: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = { current: init };
    return cells[i];
  },
  useCallback: (f: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = f;
    return cells[i];
  },
  useEffect: (fn: Fn, deps?: unknown[]) => {
    const i = at++;
    const prev = cells[i] as unknown[] | undefined;
    if (!prev || !deps || deps.some((d, k) => !Object.is(d, prev[k]))) due.push(fn);
    cells[i] = deps;
  },
}));

// If the hook read the route, a new path would be a new dep; the old hook re-read /api/shell on it.
let path = '/fleet';
vi.mock('next/navigation', () => ({ usePathname: () => path }));

const listeners: Record<string, (() => void)[]> = {};
vi.stubGlobal('window', {
  addEventListener: (t: string, f: () => void) => void (listeners[t] ??= []).push(f),
  removeEventListener: () => {},
});
const fetch = vi.fn(() => Promise.resolve(Response.json(info(8))));
vi.stubGlobal('fetch', fetch);

// Called outside React (the harness above is the renderer), so under a name the hooks lint does not read as a hook.
const { useShellSync: shellSyncOf } = await import('./useShellSync');

function info(needsYouCount: number): ShellInfo {
  return { needsYouCount, data: { mode: 'live', fakeGitlab: false, group: 'acme', illustrative: false, poll: null } };
}
const pass = (value: ShellInfo) => {
  at = 0;
  due = [];
  const out = shellSyncOf(value);
  due.forEach((f) => f());
  return out;
};

beforeEach(() => {
  cells = [];
  path = '/fleet';
  fetch.mockClear();
  for (const k of Object.keys(listeners)) delete listeners[k];
});

describe('useShellSync', () => {
  it('a route change issues no /api/shell read', () => {
    const v = info(3);
    pass(v);
    for (const p of ['/ladder', '/needs-you', '/fleet/ledgerline']) {
      path = p;
      pass(v);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('regained focus reads /api/shell once, and its answer is what the chrome shows', async () => {
    const v = info(3);
    pass(v);
    listeners.focus?.forEach((f) => f());
    listeners.focus?.forEach((f) => f()); // a second focus while the first read is in flight issues none
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual(['/api/shell', expect.objectContaining({ cache: 'no-store' })]);
    await vi.waitFor(() => expect(pass(v).needsYouCount).toBe(8));
  });

  it('a screen asking (a demo-estate cookie changed) reads /api/shell, even with a read in flight', () => {
    pass(info(3));
    listeners.focus?.forEach((f) => f());
    listeners['afterlife:shell-read']?.forEach((f) => f());
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('a new server prop (refresh() after a decision) is what the badge shows at once, with no read', () => {
    pass(info(5));
    expect(pass(info(4)).needsYouCount).toBe(4);
    expect(fetch).not.toHaveBeenCalled();
  });
});
