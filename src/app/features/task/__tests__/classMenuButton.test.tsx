// The class filter's trigger toggles: a click that arrives with no press before it (assistive tech or voice control
// activating the button, element.click()) closes the open menu. useMenu's reopen guard only covers a mouse press,
// so the `isOpen ? close()` branch in ClassMenuButton is the only thing that closes it on that path.
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Plain-node vitest cannot mount a component, so React's state hooks are a tiny re-render harness (as in useMenu.test).
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
vi.stubGlobal('document', { activeElement: null, addEventListener: () => {} });

const { ClassMenuButton } = await import('../components/toolbar/ClassMenuButton');
type ButtonProps = { 'aria-expanded': boolean; onClick: (e: { currentTarget: HTMLElement }) => void };

const trigger = { getBoundingClientRect: () => ({ left: 0, bottom: 0 }), contains: (n: unknown) => n === trigger, focus: () => {} } as unknown as HTMLElement;
const button = () => {
  at = 0;
  const tree = ClassMenuButton({ tasks: [], value: 'all', onChange: () => {} }) as ReactElement<{ children: ReactElement<ButtonProps>[] }>;
  return tree.props.children[0]!.props;
};

beforeEach(() => {
  cells.length = 0;
});

describe('ClassMenuButton trigger', () => {
  it('a click opens the menu', () => {
    button().onClick({ currentTarget: trigger });
    expect(button()['aria-expanded']).toBe(true);
  });
  it('a click with no press before it closes the open menu instead of reopening it', () => {
    button().onClick({ currentTarget: trigger });
    button().onClick({ currentTarget: trigger });
    expect(button()['aria-expanded']).toBe(false);
  });
});
