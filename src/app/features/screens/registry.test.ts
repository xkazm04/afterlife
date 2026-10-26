import { describe, expect, it, vi } from 'vitest';
import { moduleOf, SCREEN_KEYS } from '@/components/shell/host/model/routes';
import { loaderFor, MODULE_LOADERS, splitQuery } from './registry';

// The client registry renders screens (React, next/navigation): stub the router so it imports in plain node.
vi.mock('next/navigation', () => ({ useRouter: () => ({}), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
const { ALL_SCREENS, SCREENS } = await import('@/components/shell/host/registry');

// The two registries against each other and the route table: a module names only its own keys, once; a claimed
// (ready) screen streams exactly the slices it declares; an unclaimed key has no loader yet or one that is complete.
describe('the screen registries', () => {
  it('every route-table key has one client definition, from its own module', () => {
    expect(ALL_SCREENS.map((d) => d.key).sort()).toEqual([...SCREEN_KEYS].sort());
  });

  it('each module serves only its own keys', () => {
    for (const [mod, loaders] of Object.entries(MODULE_LOADERS)) {
      for (const key of Object.keys(loaders)) expect(moduleOf(key as never), `${mod} serves ${key}`).toBe(mod);
    }
  });

  it('a ready screen has a loader whose slices are exactly the ones it declares, in order', () => {
    for (const key of SCREEN_KEYS) {
      const def = SCREENS[key];
      if (!def?.ready) continue;
      expect(Object.keys(loaderFor(key)?.loader.slices ?? {}), key).toEqual([...def.slices]);
    }
  });

  it('paramSlices name declared slices of a param key (task and setup keep the rest across a param change)', () => {
    for (const def of ALL_SCREENS) {
      if (!def.paramSlices) continue;
      expect(def.key, `${def.key}: paramSlices on a key without a param`).toMatch(/\/\[\w+\]$/);
      for (const s of def.paramSlices) expect(def.slices, `${def.key} paramSlices ${s}`).toContain(s);
    }
    expect(SCREENS['task/[id]']?.paramSlices).toEqual(['detail', 'ledger']);
    expect(SCREENS['setup/[node]']?.paramSlices).toEqual(['catalogue']);
  });

  it('the Monitor is converted (the reference); unknown keys have no loader', () => {
    expect(SCREENS.monitor?.ready).toBe(true);
    expect(loaderFor('monitor')).not.toBeNull();
    expect(loaderFor('nope')).toBeNull();
  });
});

describe('splitQuery', () => {
  it('takes the key’s param out of the query and leaves the page’s own', () => {
    const s = splitQuery('fleet/[project]', new URLSearchParams('project=p1&tab=ci'));
    expect(s?.params).toEqual({ project: 'p1' });
    expect(s?.search.toString()).toBe('tab=ci');
  });
  it('a key without a param keeps the whole query (fleet’s ?project= redirect is its own)', () => {
    expect(splitQuery('fleet', new URLSearchParams('project=p1'))?.search.get('project')).toBe('p1');
  });
  it('a param key without its param: null (a 400)', () => {
    expect(splitQuery('task/[id]', new URLSearchParams('x=1'))).toBeNull();
  });
});
