import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XRAY_FIRST_KEY, XRAY_SEEN_KEY } from './keys';

// The store keeps module state for a page life, so each test imports a fresh copy against its own window stub.
const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};
const refusing = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
};
const fresh = async (localStorage: unknown) => {
  vi.stubGlobal('window', { localStorage });
  vi.resetModules();
  return import('./store');
};

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('xray store', () => {
  it('toggles, sets on, and steps per path', async () => {
    const { xrayStore, stepOn } = await fresh(memory());
    const calls = vi.fn();
    const off = xrayStore.subscribe(calls);
    expect(xrayStore.get().on).toBe(false);
    xrayStore.toggle();
    expect(xrayStore.get().on).toBe(true);
    xrayStore.setOn(true); // no change: no notification
    expect(calls).toHaveBeenCalledTimes(1);
    xrayStore.setOn(false);
    xrayStore.setStep('/fleet', 3);
    expect(xrayStore.get()).toMatchObject({ on: true, step: 3, stepPath: '/fleet' });
    expect(stepOn(xrayStore.get(), '/fleet')).toBe(3);
    expect(stepOn(xrayStore.get(), '/runs')).toBe(0);
    off();
  });

  it('persists a seen screen once and reads it back', async () => {
    const s = memory();
    const a = await fresh(s);
    a.xrayStore.markSeen('fleet');
    a.xrayStore.markSeen('fleet');
    expect(JSON.parse(s.m.get(XRAY_SEEN_KEY) ?? '')).toEqual(['fleet']);
    const b = await fresh(s);
    expect(b.xrayStore.get().seen).toEqual(['fleet']);
  });

  it('takes the first visit once per browser', async () => {
    const s = memory();
    const { xrayStore } = await fresh(s);
    expect(xrayStore.takeFirstVisit()).toBe(true);
    expect(s.m.has(XRAY_FIRST_KEY)).toBe(true);
    expect(xrayStore.takeFirstVisit()).toBe(false);
  });

  it('survives a store that throws on every read and write', async () => {
    const { xrayStore } = await fresh(refusing);
    expect(() => xrayStore.markSeen('fleet')).not.toThrow();
    expect(xrayStore.get().seen).toEqual(['fleet']);
    expect(xrayStore.takeFirstVisit()).toBe(false);
  });
});
