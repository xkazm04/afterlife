import { describe, expect, it } from 'vitest';
import { carry, freshEntry } from './entry';
import { arrivalSearch, dropQuery, linkTarget, type Loc } from './loc';

const loc = (path: string, search = ''): Loc => ({ key: 'fleet', params: {}, path, search });
const url = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('arrivalSearch: the query a screen gets when Next renders a path the host has not seen', () => {
  it('the showing screen keeps its own query', () => {
    expect(arrivalSearch('/fleet', { pathname: '/fleet', search: '' }, loc('/fleet', 'view=stages'), undefined)).toBe('view=stages');
  });
  it('Back across a router navigation: the address bar already holds the query (W1: it used to be empty)', () => {
    const project: Loc = { key: 'fleet/[project]', params: { project: 'p1' }, path: '/fleet/p1', search: '' };
    expect(arrivalSearch('/fleet', { pathname: '/fleet', search: '?view=classes' }, project, loc('/fleet', 'view=stages'))).toBe('view=classes');
  });
  it('the address bar elsewhere (a router push not committed yet): the kept query, else none', () => {
    expect(arrivalSearch('/fleet', { pathname: '/ladder', search: '?x=1' }, null, loc('/fleet', 'view=stages'))).toBe('view=stages');
    expect(arrivalSearch('/fleet', { pathname: '/ladder', search: '?x=1' }, null, undefined)).toBe('');
  });
  it('hydrating (no address bar read): the server drew no query', () => {
    expect(arrivalSearch('/fleet', null, null, undefined)).toBe('');
  });
});

describe('linkTarget: where a link goes', () => {
  const kept = loc('/fleet', 'view=stages');
  it('a link with a query of its own goes there', () => {
    expect(linkTarget(url('/fleet', '?view=classes'), '/fleet', kept, '/ladder')).toBe('/fleet?view=classes');
  });
  it('a bare link to a screen left earlier returns to the query it was left with', () => {
    expect(linkTarget(url('/fleet', '', '#t'), '/fleet', kept, '/ladder')).toBe('/fleet?view=stages#t');
  });
  it('a bare link to the screen that is showing clears its query (cycles: from the estate to the project scope)', () => {
    expect(linkTarget(url('/cycles'), '/cycles', { ...kept, key: 'cycles', path: '/cycles', search: 'scope=estate' }, '/cycles')).toBe('/cycles');
  });
  it('another instance, or no kept query: as written', () => {
    expect(linkTarget(url('/fleet/p2'), '/fleet/p2', { ...kept, path: '/fleet/p1' }, null)).toBe('/fleet/p2');
    expect(linkTarget(url('/fleet'), '/fleet', loc('/fleet'), null)).toBe('/fleet');
    expect(linkTarget(url('/about'), null, undefined, null)).toBe('/about');
  });
});

describe('dropQuery', () => {
  it('the redirecting screen forgets its query; nothing else changes', () => {
    const locs = { fleet: loc('/fleet', 'project=p1'), monitor: { ...loc('/monitor', 'x=1'), key: 'monitor' as const } };
    const out = dropQuery(locs, 'fleet');
    expect(out.fleet?.search).toBe('');
    expect(out.monitor).toBe(locs.monitor);
    expect(dropQuery(out, 'fleet')).toBe(out);
  });
});

describe('carry: another param on a screen that keeps its other slices', () => {
  const kept = {
    ...freshEntry('/task/a'),
    slices: { docket: { state: 'ok' as const, data: [1], asOf: 't' }, detail: { state: 'ok' as const, data: 'a', asOf: 't' }, page: { state: 'error' as const, reason: 'x' } },
    texts: { docket: '[1]', detail: '"a"' },
    notFound: true,
  };
  it('drops the param slices, keeps the rest, and reads the param slices plus whatever is not read ok', () => {
    const c = carry(kept, '/task/b', ['detail', 'ledger'], ['docket', 'detail', 'ledger', 'page']);
    expect(c?.entry.instance).toBe('/task/b');
    expect(c?.entry.slices.docket).toBe(kept.slices.docket);
    expect(c?.entry.slices.detail).toBeUndefined();
    expect(c?.entry.texts).toEqual({ docket: '[1]' });
    expect(c?.entry.notFound).toBe(false);
    expect(c?.only).toEqual(['detail', 'ledger', 'page']);
  });
  it('a key without paramSlices starts fresh', () => {
    expect(carry(kept, '/task/b', [], ['docket'])).toBeNull();
  });
});
