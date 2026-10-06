import { describe, expect, it } from 'vitest';
import { isTypingTarget, matchHotkey, type KeyEventLike } from './hotkeys';

const ev = (key: string, m: Partial<KeyEventLike> = {}): KeyEventLike => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...m,
});

describe('matchHotkey', () => {
  it('matches a bare key case-insensitively', () => {
    expect(matchHotkey(ev('j'), { key: 'j' })).toBe(true);
    expect(matchHotkey(ev('J', { shiftKey: true }), { key: 'j' })).toBe(true);
    expect(matchHotkey(ev('k'), { key: 'j' })).toBe(false);
  });
  it('requires Cmd or Ctrl only when asked', () => {
    expect(matchHotkey(ev('i', { metaKey: true }), { key: 'i', mod: true })).toBe(true);
    expect(matchHotkey(ev('i', { ctrlKey: true }), { key: 'i', mod: true })).toBe(true);
    expect(matchHotkey(ev('i'), { key: 'i', mod: true })).toBe(false);
    expect(matchHotkey(ev('i', { ctrlKey: true }), { key: 'i' })).toBe(false);
  });
  it('treats shift as optional unless specified', () => {
    expect(matchHotkey(ev('?', { shiftKey: true }), { key: '?' })).toBe(true);
    expect(matchHotkey(ev('a', { shiftKey: true }), { key: 'a', shift: false })).toBe(false);
    expect(matchHotkey(ev('a', { shiftKey: true }), { key: 'a', shift: true })).toBe(true);
  });
  it('rejects unexpected alt', () => {
    expect(matchHotkey(ev('a', { altKey: true }), { key: 'a' })).toBe(false);
    expect(matchHotkey(ev('a', { altKey: true }), { key: 'a', alt: true })).toBe(true);
  });
});

describe('isTypingTarget', () => {
  it('detects inputs and ignores others', () => {
    expect(isTypingTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
