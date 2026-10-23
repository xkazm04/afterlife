// The store follows the attribute, and another tab's storage changes reach it (the storage event).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXT_SIZE_ATTRIBUTE, TEXT_SIZE_STORAGE_KEY } from './textSize';
import { getTextSizeSnapshot, subscribeTextSize } from './textSizeStore';

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
    expect([getTextSizeSnapshot(), seen.mock.calls.length]).toEqual(['standard', 1]);
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
