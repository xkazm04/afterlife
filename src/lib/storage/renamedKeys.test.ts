// The one-time move of pre-rename browser keys: run the real inline script against in-memory stores.
import { describe, expect, it } from 'vitest';
import { TEXT_SIZE_STORAGE_KEY } from '@/lib/settings/textSize';
import { renamedKey, renamedKeysScriptSource } from './renamedKeys';

/** A Storage over a Map, enough for the script: length, key(i), getItem, setItem, removeItem. */
function store(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

const run = (local: unknown, session: unknown) => new Function('localStorage', 'sessionStorage', renamedKeysScriptSource())(local, session);

describe('pre-rename browser keys move once', () => {
  it('moves every belay.* key to afterlife.* and removes the old one, in both stores', () => {
    const local = store({ 'belay.textSize': 'larger', 'belay.fleet.lastLook': '{"v":1}', other: 'x' });
    const session = store({ 'belay.onboard.session.acme': '{}' });
    run(local, session);
    expect(local.dump()).toEqual({ [TEXT_SIZE_STORAGE_KEY]: 'larger', 'afterlife.fleet.lastLook': '{"v":1}', other: 'x' });
    expect(session.dump()).toEqual({ 'afterlife.onboard.session.acme': '{}' });
  });

  it('keeps a value already saved under the new name (a newer save wins) and still drops the old key', () => {
    const local = store({ 'belay.textSize': 'smaller', 'afterlife.textSize': 'larger' });
    run(local, store());
    expect(local.dump()).toEqual({ 'afterlife.textSize': 'larger' });
  });

  it('runs again with nothing to do, and blocked storage throws nothing', () => {
    const local = store({ 'afterlife.textSize': 'larger' });
    run(local, store());
    expect(local.dump()).toEqual({ 'afterlife.textSize': 'larger' });
    const blocked = { get length(): number { throw new Error('SecurityError'); } };
    expect(() => run(blocked, blocked)).not.toThrow();
  });

  it('names the new key for a pre-rename one only', () => {
    expect(renamedKey('belay.textSize')).toBe('afterlife.textSize');
    expect(renamedKey('afterlife.textSize')).toBeNull();
    expect(renamedKey('tab')).toBeNull();
  });
});
