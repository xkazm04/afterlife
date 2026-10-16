// A client-side return to the door must be fitted before the first paint: the inline script only runs on a full load.
// No DOM environment here, so react is replaced by a recorder that runs layout effects ("before paint") and effects
// ("after paint") in separate phases, and the document is a bare style map.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rt = vi.hoisted(() => ({ layout: [] as (() => void | (() => void))[], after: [] as (() => void | (() => void))[] }));

vi.mock('react', () => ({
  useLayoutEffect: (fn: () => void | (() => void)) => void rt.layout.push(fn),
  useEffect: (fn: () => void | (() => void)) => void rt.after.push(fn),
}));

import { useStageFit } from './useStageFit';

const vars = new Map<string, string>();

beforeEach(() => {
  rt.layout = [];
  rt.after = [];
  vars.clear();
  vi.stubGlobal('innerWidth', 800);
  vi.stubGlobal('innerHeight', 500);
  vi.stubGlobal('addEventListener', () => undefined);
  vi.stubGlobal('removeEventListener', () => undefined);
  vi.stubGlobal('window', { addEventListener: () => undefined, removeEventListener: () => undefined });
  vi.stubGlobal('document', { documentElement: { style: { setProperty: (k: string, v: string) => vars.set(k, v), removeProperty: (k: string) => vars.delete(k) } } });
});

describe('useStageFit', () => {
  it('has set --s, --ox and --oy by the end of the layout phase, before paint', () => {
    useStageFit();
    rt.layout.forEach((run) => run());
    expect([...vars.keys()].sort()).toEqual(['--ox', '--oy', '--s']);
  });

  it('removes the vars again on unmount', () => {
    useStageFit();
    const cleanups = [...rt.layout, ...rt.after].map((run) => run());
    cleanups.forEach((c) => typeof c === 'function' && c());
    expect(vars.size).toBe(0);
  });
});
