import { describe, expect, it, vi } from 'vitest';
import { bindKeymap, capsOf, defineKeymap, type KeyHandler } from './keymap';
import { dispatchHotkey } from './useHotkeys';

const press = (key: string) =>
  ({ key, repeat: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, target: null, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

const h = () => vi.fn<KeyHandler>();

const MAP = defineKeymap('Test', [
  { id: 'next', keys: [{ key: 'j' }], does: 'Next' },
  { id: 'prev', keys: [{ key: 'k' }], does: 'Previous' },
  { id: 'pick', keys: ['1', '2', '3'].map((key) => ({ key })), does: 'Pick one' },
]);

describe('bindKeymap', () => {
  it('throws, naming the id, when a declared key has no handler', () => {
    const handlers = { next: h(), pick: h() };
    expect(() => bindKeymap(MAP, handlers as never)).toThrow(/prev/);
  });
  it('throws on a handler for an id the keymap does not declare', () => {
    const handlers = { next: h(), prev: h(), pick: h(), ghost: h() };
    expect(() => bindKeymap(MAP, handlers as never)).toThrow(/ghost/);
  });
  it('binds every key; a j press runs exactly the next handler', () => {
    const next = h();
    const prev = h();
    const pick = h();
    const hotkeys = bindKeymap(MAP, { next, prev, pick });
    expect(hotkeys.map((h) => h.key)).toEqual(['j', 'k', '1', '2', '3']);
    expect(dispatchHotkey(hotkeys, press('j'))).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
    expect(prev).not.toHaveBeenCalled();
    expect(pick).not.toHaveBeenCalled();
  });
  it('a handler list binds key i to handler i, and only as many keys as it has handlers', () => {
    const one = h();
    const two = h();
    const hotkeys = bindKeymap(MAP, { next: h(), prev: h(), pick: [one, two] });
    expect(hotkeys.map((h) => h.key)).toEqual(['j', 'k', '1', '2']);
    dispatchHotkey(hotkeys, press('2'));
    expect(two).toHaveBeenCalledTimes(1);
    expect(one).not.toHaveBeenCalled();
    expect(() => bindKeymap(MAP, { next: h(), prev: h(), pick: [one, one, one, one] })).toThrow(/pick/);
  });
});

describe('capsOf', () => {
  it('names the keys a person reads on the cap', () => {
    expect(capsOf([{ key: 'ArrowLeft' }, { key: ' ' }, { key: 'Escape' }, { key: '/' }])).toEqual(['←', 'Space', 'Esc', '/']);
  });
  it('collapses a run of digits into one cap, and keeps 0 apart', () => {
    expect(capsOf(['1', '2', '3', '4', '5'].map((key) => ({ key })))).toEqual(['1-5']);
    expect(capsOf(['0', '1', '2', '3', '4', '5'].map((key) => ({ key })))).toEqual(['0', '1-5']);
  });
});
