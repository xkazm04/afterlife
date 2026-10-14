import { describe, expect, it, vi } from 'vitest';
import { dispatchHotkey, type Hotkey } from './useHotkeys';

const press = (key: string, repeat = false) => {
  const preventDefault = vi.fn();
  const e = { key, repeat, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, target: null, preventDefault } as unknown as KeyboardEvent;
  return { e, preventDefault };
};

describe('dispatchHotkey auto-repeat', () => {
  it('does not re-fire a `once` hotkey on a repeat, but still cancels the default', () => {
    const handler = vi.fn();
    const keys: Hotkey[] = [{ key: ' ', once: true, handler }];
    const first = press(' ');
    dispatchHotkey(keys, first.e);
    const held = press(' ', true);
    expect(dispatchHotkey(keys, held.e)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(held.preventDefault).toHaveBeenCalled();
  });
  it('still fires a non-`once` hotkey on a repeat', () => {
    const handler = vi.fn();
    dispatchHotkey([{ key: 'ArrowRight', handler }], press('ArrowRight', true).e);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
