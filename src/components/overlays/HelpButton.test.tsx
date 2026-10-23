import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Plain-node vitest cannot mount usePopover, so it is replaced by a stand-in that does what the real one does for this
// question: show() keeps the content, and the popover is that content in a role=tooltip (non-sticky) or role=dialog panel.
const pop = {
  content: null as ReactNode,
  isOpen: false,
  isSticky: false,
  show: vi.fn((_a: unknown, content: ReactNode, opts?: { sticky?: boolean }) => {
    pop.content = content;
    pop.isOpen = true;
    pop.isSticky = !!opts?.sticky;
  }),
  hide: vi.fn(),
  close: vi.fn(),
  toggle: vi.fn(),
};
vi.mock('./popover/usePopover', () => ({
  usePopover: () => ({ ...pop, popover: pop.isOpen ? <div role={pop.isSticky ? 'dialog' : 'tooltip'}>{pop.content}</div> : null }),
}));

// HelpButton is called as a function here, outside a render, so the one hook it uses directly is stood in too.
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), useId: () => ':legend:' }));

const { HelpButton } = await import('./HelpButton');

type Btn = { onMouseEnter: (e: unknown) => void; 'aria-describedby'?: string };
const draw = () => (HelpButton({ title: 'Legend', children: <p>armed means watching</p> }) as ReactElement<{ children: ReactElement<Btn>[] }>).props.children;
const html = () => renderToStaticMarkup(<>{draw()[0]}{draw()[1]}</>);
/** How many of the shown tooltips the trigger points at with aria-describedby (an id that exists once, inside the tooltip). */
const referenced = (markup: string) => {
  const id = /aria-describedby="([^"]+)"/.exec(markup)?.[1];
  if (!id) return 0;
  const tip = /<div role="tooltip">(.*)<\/div>/.exec(markup)?.[1] ?? '';
  return tip.split(`id="${id}"`).length === 2 ? 1 : 0;
};

beforeEach(() => {
  pop.content = null;
  pop.isOpen = false;
  pop.isSticky = false;
});

describe('HelpButton hover legend', () => {
  it('points the button at the tooltip while the hover legend shows', () => {
    draw()[0]!.props.onMouseEnter({ currentTarget: {} });
    expect(referenced(html())).toBe(1);
  });
  it('has no description while nothing shows', () => {
    expect(html()).not.toContain('aria-describedby');
  });
  it('drops the description for the sticky dialog, which is named by aria-expanded instead', () => {
    pop.show({}, <p>x</p>, { sticky: true });
    expect(html()).not.toContain('aria-describedby');
  });
});
