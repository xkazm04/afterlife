import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cx, onActivate } from './cx';

const key = (k: string) => ({ key: k, preventDefault: vi.fn() }) as unknown as KeyboardEvent<Element> & { preventDefault: ReturnType<typeof vi.fn> };

describe('cx', () => {
  it('joins the truthy names and skips false, null, undefined and empty', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });
});

describe('onActivate', () => {
  it.each(['Enter', ' '])('runs on %j and stops the default (no page scroll on Space)', (k) => {
    const fn = vi.fn();
    const e = key(k);
    onActivate(fn)(e);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });
  it.each(['Tab', 'Escape', 'a', 'ArrowDown'])('leaves %j alone', (k) => {
    const fn = vi.fn();
    const e = key(k);
    onActivate(fn)(e);
    expect(fn).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
