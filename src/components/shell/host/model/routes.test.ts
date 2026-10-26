import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { matchRoute, moduleOf, paramOf, pathFor, SCREEN_KEYS } from './routes';

// The route table against the routes on disk: every (app) page is a key (but /settings, which only redirects), and
// every key is a page. A route added without a key would never be drawn by the host; a key without a page, never loaded.
const APP = path.resolve(import.meta.dirname, '../../../../app/(app)');
function pageKeys(dir: string, rel: string[] = []): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? pageKeys(path.join(dir, e.name), [...rel, e.name]) : e.name === 'page.tsx' ? [rel.join('/')] : [],
  );
}

describe('the route table', () => {
  it('names every (app) page but the /settings redirect, and nothing else', () => {
    expect(pageKeys(APP).filter((k) => k !== 'settings').sort()).toEqual([...SCREEN_KEYS].sort());
  });
  it('owns each key by its module; settings pages are the settings module', () => {
    expect(moduleOf('fleet/[project]')).toBe('fleet');
    expect(moduleOf('settings/keyboard')).toBe('settings');
    expect(paramOf('task/[id]')).toBe('id');
    expect(paramOf('onboard/estate')).toBeNull();
  });
});

describe('matchRoute', () => {
  it('matches every key from its own path, params decoded, the query copied', () => {
    for (const key of SCREEN_KEYS) {
      const p = pathFor(key, { [paramOf(key) ?? 'x']: 'a b/c' });
      expect(p, key).not.toBeNull();
      const m = matchRoute(p ?? '', '?q=1');
      expect(m?.key, key).toBe(key);
      if (paramOf(key)) expect(m?.params[paramOf(key) ?? '']).toBe('a b/c');
      expect(m?.search.get('q')).toBe('1');
    }
  });
  it('a static key wins over a param key at the same depth', () => {
    expect(matchRoute('/onboard/estate')?.key).toBe('onboard/estate');
    expect(matchRoute('/settings/keyboard')?.key).toBe('settings/keyboard');
  });
  it('a trailing slash is the same screen', () => {
    expect(matchRoute('/monitor/')).toMatchObject({ key: 'monitor', path: '/monitor' });
  });
  it('anything else is not the host’s', () => {
    for (const p of ['/', '/about', '/settings', '/settings/nope', '/monitor/x', '/fleet/a/b', '/fleetx', '/fleet//x', '/fleet/%E0%A4%A']) {
      expect(matchRoute(p), p).toBeNull();
    }
  });
  it('a param key needs its param to have a path', () => {
    expect(pathFor('fleet/[project]')).toBeNull();
    expect(pathFor('fleet/[project]', { project: 'p 1' })).toBe('/fleet/p%201');
    expect(pathFor('monitor')).toBe('/monitor');
  });
});
