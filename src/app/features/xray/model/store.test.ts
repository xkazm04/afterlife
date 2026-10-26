import { afterEach, describe, expect, it, vi } from 'vitest';

// The store keeps module state for a page life, so each test imports a fresh copy.
const fresh = async () => {
  vi.resetModules();
  return import('./store');
};

afterEach(() => vi.unstubAllGlobals());

describe('xray store', () => {
  it('toggles, sets on, and steps per path', async () => {
    const { xrayStore, stepOn } = await fresh();
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

  it('never opens by itself: first run belongs to the guide', async () => {
    const { xrayStore } = await fresh();
    expect(xrayStore.get().on).toBe(false);
    expect('takeFirstVisit' in xrayStore).toBe(false);
  });
});
