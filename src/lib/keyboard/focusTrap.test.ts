import { describe, expect, it } from 'vitest';
import { trapTarget } from './focusTrap';

const items = ['cancel', 'body-link', 'send'];

describe('trapTarget', () => {
  it('wraps Tab from the last element to the first', () => {
    expect(trapTarget(items, 'send', false, 'sheet')).toBe('cancel');
  });
  it('wraps Shift+Tab from the first element to the last', () => {
    expect(trapTarget(items, 'cancel', true, 'sheet')).toBe('send');
  });
  it('lets the browser move focus between the ends', () => {
    expect(trapTarget(items, 'body-link', false, 'sheet')).toBeNull();
    expect(trapTarget(items, 'body-link', true, 'sheet')).toBeNull();
    expect(trapTarget(items, 'cancel', false, 'sheet')).toBeNull();
  });
  it('pulls focus on the dialog itself to the near end', () => {
    expect(trapTarget(items, 'sheet', false, 'sheet')).toBe('cancel');
    expect(trapTarget(items, 'sheet', true, 'sheet')).toBe('send');
    expect(trapTarget(items, null, true, 'sheet')).toBe('send');
  });
  it('keeps focus on the dialog when it has nothing to Tab to', () => {
    expect(trapTarget([], 'sheet', false, 'sheet')).toBe('sheet');
    expect(trapTarget([], null, true, 'sheet')).toBe('sheet');
  });
});
