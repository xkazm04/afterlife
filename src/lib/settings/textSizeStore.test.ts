// The store follows the attribute, and another tab's storage changes reach it (the storage event).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TEXT_SIZE, TEXT_SIZE_ATTRIBUTE, TEXT_SIZE_STORAGE_KEY } from './textSize';
import { applyTextSize, getTextSizeSnapshot, subscribeTextSize } from './textSizeStore';

let attrs: Record<string, string>;
let onStorage: ((e: Partial<StorageEvent>) => void) | null;

beforeEach(() => {
  attrs = {};
  onStorage = null;
  vi.stubGlobal('document', { documentElement: { getAttribute: (k: string) => attrs[k] ?? null, setAttribute: (k: string, v: string) => (attrs[k] = v) } });
  vi.stubGlobal('window', {
    addEventListener: (_: string, l: (e: Partial<StorageEvent>) => void) => (onStorage = l),
    removeEventListener: () => (onStorage = null),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("another tab's storage", () => {
  it('a new size saved there is applied here', () => {
    const seen = vi.fn();
    const off = subscribeTextSize(seen);
    onStorage?.({ key: TEXT_SIZE_STORAGE_KEY, newValue: 'larger' });
    expect([getTextSizeSnapshot(), seen.mock.calls.length]).toEqual(['larger', 1]);
    off();
  });
  it('a cleared store (localStorage.clear(), key null) resets here to the default, as a reload would', () => {
    attrs[TEXT_SIZE_ATTRIBUTE] = 'larger';
    const seen = vi.fn();
    const off = subscribeTextSize(seen);
    onStorage?.({ key: null, newValue: null });
    expect([getTextSizeSnapshot(), seen.mock.calls.length]).toEqual([DEFAULT_TEXT_SIZE, 1]);
    off();
  });
  it('another key changing leaves the size alone', () => {
    attrs[TEXT_SIZE_ATTRIBUTE] = 'larger';
    const seen = vi.fn();
    const off = subscribeTextSize(seen);
    onStorage?.({ key: 'something.else', newValue: 'x' });
    expect([getTextSizeSnapshot(), seen.mock.calls.length]).toEqual(['larger', 0]);
    off();
  });
});

describe('applyTextSize reports whether the browser kept the size', () => {
  const withStorage = (storage: unknown) => {
    vi.stubGlobal('window', { localStorage: storage });
  };
  it('true when setItem works', () => {
    withStorage({ setItem: () => undefined });
    expect([applyTextSize('larger'), attrs[TEXT_SIZE_ATTRIBUTE]]).toEqual([true, 'larger']);
  });
  it('false, but still applied for this visit, when setItem throws', () => {
    withStorage({ setItem: () => { throw new Error('quota'); } });
    expect([applyTextSize('larger'), attrs[TEXT_SIZE_ATTRIBUTE]]).toEqual([false, 'larger']);
  });
  it('false when reading localStorage itself throws', () => {
    vi.stubGlobal('window', { get localStorage(): never { throw new Error('blocked'); } });
    expect(applyTextSize('smaller')).toBe(false);
  });
});

// Display's note reads this: a shortcut's refused write must not leave it saying "Saved in this browser".
describe('the store keeps whether the browser kept the size', () => {
  const fresh = async () => {
    vi.resetModules();
    return import('./textSizeStore');
  };
  const store = (getItem: () => string | null, setItem: () => void = () => undefined) => vi.stubGlobal('window', { localStorage: { getItem, setItem }, addEventListener: () => {}, removeEventListener: () => {} });
  it('on load: true when the stored size is the one on screen, or nothing is stored and it is the default', async () => {
    attrs[TEXT_SIZE_ATTRIBUTE] = 'larger';
    store(() => 'larger');
    expect((await fresh()).getTextSizeSavedSnapshot()).toBe(true);
    attrs[TEXT_SIZE_ATTRIBUTE] = DEFAULT_TEXT_SIZE;
    store(() => null);
    expect((await fresh()).getTextSizeSavedSnapshot()).toBe(true);
  });
  it('on load: false when reading localStorage throws', async () => {
    store(() => {
      throw new Error('blocked');
    });
    expect((await fresh()).getTextSizeSavedSnapshot()).toBe(false);
  });
  it('a refused write (as a shortcut makes, dropping the answer) flips it to false and tells the listeners; a kept one back', async () => {
    store(() => null, () => {
      throw new Error('quota');
    });
    const s = await fresh();
    expect(s.getTextSizeSavedSnapshot()).toBe(true);
    const seen = vi.fn();
    const off = s.subscribeTextSize(seen);
    s.applyTextSize('larger');
    expect([s.getTextSizeSavedSnapshot(), seen.mock.calls.length]).toEqual([false, 1]);
    store(() => null);
    s.applyTextSize('smaller');
    expect(s.getTextSizeSavedSnapshot()).toBe(true);
    off();
  });
});
