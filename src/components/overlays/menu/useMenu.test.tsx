import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Plain-node vitest cannot mount a hook, so React's state hooks are replaced by a tiny re-render harness: each
// `render()` calls useMenu again with the state the previous call left, the way React would after a setState.
const cells: unknown[] = [];
let at = 0;
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  useState: (init: unknown) => {
    const i = at++;
    if (!(i in cells)) cells[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [cells[i], (v: unknown) => (cells[i] = typeof v === 'function' ? (v as (p: unknown) => unknown)(cells[i]) : v)];
  },
  useCallback: (fn: unknown) => fn,
}));
const listeners: (() => void)[] = [];
vi.stubGlobal('document', { addEventListener: (_t: string, fn: () => void) => listeners.push(fn) });

const { useMenu } = await import('./useMenu');
type MenuProps = { onClose: (refocus: boolean, target?: EventTarget | null) => void };

const render = () => {
  at = 0;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- the harness above stands in for React; this is its render
  return useMenu();
};
const items = [{ label: 'Name', run: () => {} }];
const icon = {};
const trigger = { getBoundingClientRect: () => ({ left: 0, bottom: 0 }), contains: (n: unknown) => n === trigger || n === icon, focus: () => {} } as unknown as HTMLElement;
/** The press that lands outside the open menu: Menu's mousedown-away handler calls onClose(false, target). */
const pressOn = (target: unknown) => (render().menu as ReactElement<MenuProps>).props.onClose(false, target as EventTarget);

beforeEach(() => {
  cells.length = 0;
  listeners.length = 0;
  vi.useFakeTimers();
});

describe('useMenu trigger', () => {
  it('a press on the open menu`s own trigger closes it, and the click that follows does not reopen it', () => {
    render().openFrom(trigger, { items });
    expect(render().isOpen).toBe(true);
    pressOn(icon);
    expect(render().isOpen).toBe(false);
    render().openFrom(trigger, { items }); // the click of that same press
    expect(render().isOpen).toBe(false);
  });
  it('a click with no press before it (assistive tech) on the trigger of an open menu closes it instead of reopening it', () => {
    render().openFrom(trigger, { items });
    expect(render().isOpen).toBe(true);
    render().openFrom(trigger, { items });
    expect(render().isOpen).toBe(false);
    render().openFrom(trigger, { items });
    expect(render().isOpen).toBe(true);
  });
  it('openFrom a different trigger moves the menu instead of closing it', () => {
    const other = { ...trigger } as unknown as HTMLElement;
    render().openFrom(trigger, { items });
    render().openFrom(other, { items });
    expect(render().isOpen).toBe(true);
  });
  it('the next click on the trigger opens it again', () => {
    render().openFrom(trigger, { items });
    pressOn(trigger);
    render().openFrom(trigger, { items });
    vi.runAllTimers();
    listeners.forEach((fn) => fn()); // the next press begins
    render().openFrom(trigger, { items });
    expect(render().isOpen).toBe(true);
  });
  it('a press elsewhere closes it without swallowing the next click on the trigger', () => {
    render().openFrom(trigger, { items });
    pressOn({});
    expect(render().isOpen).toBe(false);
    render().openFrom(trigger, { items });
    expect(render().isOpen).toBe(true);
  });
  it('a press dragged off the trigger (no click follows) is forgotten when the next press begins', () => {
    render().openFrom(trigger, { items });
    pressOn(trigger);
    vi.runAllTimers();
    listeners.forEach((fn) => fn());
    render().openFrom(trigger, { items });
    expect(render().isOpen).toBe(true);
  });
});
