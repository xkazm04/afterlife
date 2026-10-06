import { describe, expect, it } from 'vitest';
import { createReopenGuard } from './reopenGuard';

const trigger = { id: 'trigger' };
const other = { id: 'other' };

describe('reopen guard', () => {
  it('swallows the click that follows a press on the trigger that closed the popover', () => {
    const g = createReopenGuard<object>();
    g.pressClosed(trigger, true);
    expect(g.swallows(trigger)).toBe(true);
  });

  it('swallows only once: the next click on the trigger opens it again', () => {
    const g = createReopenGuard<object>();
    g.pressClosed(trigger, true);
    expect(g.swallows(trigger)).toBe(true);
    expect(g.swallows(trigger)).toBe(false);
  });

  it('does not swallow when the press that closed it was elsewhere', () => {
    const g = createReopenGuard<object>();
    g.pressClosed(trigger, false);
    expect(g.swallows(trigger)).toBe(false);
  });

  it('does not swallow a different trigger, and forgets the old one', () => {
    const g = createReopenGuard<object>();
    g.pressClosed(trigger, true);
    expect(g.swallows(other)).toBe(false);
    expect(g.swallows(trigger)).toBe(false);
  });

  it('forgets a press that no click followed (a drag off the trigger) once the next press begins', () => {
    const g = createReopenGuard<object>();
    g.pressClosed(trigger, true);
    g.reset();
    expect(g.swallows(trigger)).toBe(false);
  });

  it('a new press that closes a popover replaces the old one', () => {
    const g = createReopenGuard<object>();
    g.pressClosed(trigger, true);
    g.pressClosed(other, true);
    expect(g.swallows(trigger)).toBe(false);
    g.pressClosed(other, true);
    expect(g.swallows(other)).toBe(true);
  });
});
