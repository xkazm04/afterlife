// The arm a browser runs: ?arm= (remembered in localStorage and the belay-arm cookie) > the remembered arm > A; outside
// `next dev` always A. Window, storage and cookie are stubbed: the tests run in node.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readNavArm } from './useNavArm';

let store: Map<string, string>;
let cookie: string;

function at(search: string, blocked = false) {
  vi.stubGlobal('window', {
    location: { search },
    localStorage: {
      getItem: (k: string) => { if (blocked) throw new Error('blocked'); return store.get(k) ?? null; },
      setItem: (k: string, v: string) => { if (blocked) throw new Error('blocked'); store.set(k, v); },
    },
  });
}

beforeEach(() => {
  store = new Map();
  cookie = '';
  vi.stubGlobal('document', { get cookie() { return cookie; }, set cookie(v: string) { cookie = v.split(';')[0] ?? ''; } });
  vi.stubEnv('NODE_ENV', 'development');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('readNavArm', () => {
  it('A with no ?arm and nothing remembered', () => {
    at('');
    expect(readNavArm()).toBe('A');
  });

  it('?arm=B wins, is remembered, and stays after the param is gone', () => {
    at('?arm=b&x=1');
    expect(readNavArm()).toBe('B');
    expect(store.get('belay.navArm')).toBe('B');
    expect(cookie).toBe('belay-arm=B');
    at('');
    expect(readNavArm()).toBe('B');
    at('?arm=C');
    expect(readNavArm()).toBe('C');
  });

  it('an unknown ?arm falls back to the remembered arm', () => {
    store.set('belay.navArm', 'C');
    at('?arm=zz');
    expect(readNavArm()).toBe('C');
  });

  it('blocked storage: the URL still decides, else A', () => {
    at('?arm=B', true);
    expect(readNavArm()).toBe('B');
    at('', true);
    expect(readNavArm()).toBe('A');
  });

  it('outside next dev always A, whatever the URL or storage says', () => {
    vi.stubEnv('NODE_ENV', 'production');
    store.set('belay.navArm', 'C');
    at('?arm=B');
    expect(readNavArm()).toBe('A');
    expect(cookie).toBe('');
  });
});
