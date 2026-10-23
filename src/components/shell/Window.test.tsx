import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { BottomDrawer } from './BottomDrawer';
import { DetailPage, DetailSection } from './detail/DetailPage';
import { SidebarItem } from './sidebar/SidebarItem';
import { Window, type WindowProps } from './Window';

vi.mock('next/navigation', () => ({ usePathname: () => '/ladder/core' }));
vi.mock('next/image', () => ({ default: (p: { src: string }) => createElement('img', { src: p.src }) }));
vi.mock('next/link', () => ({
  default: (p: Record<string, unknown>) => {
    const { children, href, ...rest } = p;
    return createElement('a', { href, ...rest }, children as ReactNode);
  },
}));

// Window is the frame of every screen (60 files import from components/shell): its props are a contract, so this pins
// what a screen gets for the props it passes. Class names are not asserted: CSS modules are not processed here.
const page = (p: Partial<WindowProps> = {}) => renderToString(<ToastProvider><Window title="Ladder" {...p} /></ToastProvider>);
const tag = (html: string, re: RegExp) => re.exec(html)?.[0] ?? '';
const HIDDEN = /\shidden=""/; // not aria-hidden="false", which also contains the word

describe('Window props', () => {
  it('shows title, subtitle, status and the children in the pane', () => {
    const html = page({ subtitle: 'acme-lab', status: 'ready', children: <p>pane body</p> });
    expect(html).toContain('<b>Ladder</b>');
    expect(html).toContain('<span>acme-lab</span>');
    expect(html).toContain('ready');
    expect(html).toContain('<p>pane body</p>');
  });

  it('puts the pane in the one main landmark, so a screen reader can jump past the chrome to the screen', () => {
    const html = page({ children: <p>pane body</p> });
    expect(html.match(/<main[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/<main[^>]*><p>pane body<\/p><\/main>/);
  });

  it('has no inspector and no toggle when none is passed', () => {
    const html = page();
    expect(html).not.toContain('id="inspector"');
    expect(html).not.toContain('Toggle inspector');
  });

  it('opens the inspector by default and wires the toggle to it', () => {
    const html = page({ inspector: <i>detail</i> });
    expect(html).toContain('<i>detail</i>');
    const toggle = tag(html, /<button[^>]*aria-label="Toggle inspector"[^>]*>/);
    expect(toggle).toContain('aria-pressed="true"');
    expect(toggle).toContain('aria-controls="inspector"');
    expect(tag(html, /<aside[^>]*id="inspector"[^>]*>/)).not.toMatch(HIDDEN);
  });

  it('keeps a closed inspector mounted but hidden, and lets the controlled prop win over the default', () => {
    const closed = page({ inspector: <i>detail</i>, defaultInspectorOpen: false });
    expect(closed).toContain('<i>detail</i>');
    expect(tag(closed, /<aside[^>]*id="inspector"[^>]*>/)).toMatch(HIDDEN);
    expect(tag(closed, /<button[^>]*aria-label="Toggle inspector"[^>]*>/)).toContain('aria-pressed="false"');
    const controlled = page({ inspector: <i>detail</i>, defaultInspectorOpen: false, inspectorOpen: true });
    expect(tag(controlled, /<aside[^>]*id="inspector"[^>]*>/)).not.toMatch(HIDDEN);
  });

  it('shows the legend button only when help is passed, under helpTitle', () => {
    expect(page()).not.toContain('aria-haspopup="dialog"');
    expect(page({ help: 'legend text', helpTitle: 'Tiers' })).toContain('aria-label="Tiers"');
  });
});

describe('Window sidebar', () => {
  it('marks the route as the current nav item and no other', () => {
    const html = page();
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(tag(html, /<a[^>]*href="\/ladder"[^>]*>/)).toContain('aria-current="page"');
  });

  it('names the ⌘K chip by what it opens, keeping its visible caps in the name', () => {
    const chip = tag(page(), /<button[^>]*>⌘K<\/button>/);
    expect(chip).toContain('aria-label="Go to anything (⌘K)"');
  });

  it('offers the hide button while the sidebar is shown', () => {
    expect(page()).toContain('aria-label="Hide sidebar"');
    expect(page()).not.toContain('aria-label="Show sidebar"');
  });
});

describe('SidebarItem', () => {
  const html = (node: ReactNode) => renderToString(<>{node}</>);
  it('is a link with href and a button without', () => {
    expect(html(<SidebarItem label="Fleet" href="/fleet" />)).toMatch(/^<a[^>]*href="\/fleet"/);
    expect(html(<SidebarItem label="Open" />)).toMatch(/^<button[^>]*type="button"/);
  });
  it.each([undefined, null, false, ''])('takes no room for an empty count (%j)', (count) => {
    expect(html(<SidebarItem label="Fleet" count={count} />).match(/<span/g)).toHaveLength(2);
  });
  it('shows a count, including zero', () => {
    expect(html(<SidebarItem label="Fleet" count={0} />)).toContain('>0</span>');
  });
  it('marks current as page on a link and true on a button', () => {
    expect(html(<SidebarItem label="a" href="/a" current />)).toContain('aria-current="page"');
    expect(html(<SidebarItem label="a" current />)).toContain('aria-current="true"');
  });
});

describe('DetailPage', () => {
  it('names the way back, heads the page with the thing and has no inspector', () => {
    const out = renderToString(
      <ToastProvider>
        <DetailPage parent={{ label: 'Ladder', href: '/ladder' }} title="core" lede="the answer">
          <DetailSection title="Card">x</DetailSection>
        </DetailPage>
      </ToastProvider>,
    );
    expect(tag(out, /<a[^>]*aria-label="Back to Ladder"[^>]*>/)).toContain('href="/ladder"');
    expect(out).toContain('>core</h1>');
    expect(out).toContain('the answer');
    expect(out).toContain('>Card</h2>');
    expect(out).not.toContain('id="inspector"');
  });
});

describe('BottomDrawer', () => {
  // ARIA prohibits naming a generic span, so an aria-label on the count is dropped by assistive tech: the count is read
  // as its own text right after the title, inside the region the title names.
  it('names the region by its title and leaves the count as plain text', () => {
    const out = renderToString(<BottomDrawer title="Outbox" count={2} closeLabel="Hide outbox" onClose={() => {}}>x</BottomDrawer>);
    expect(out).toMatch(/^<section[^>]*aria-label="Outbox"/);
    expect(out).toContain('<b>Outbox</b>');
    expect(tag(out, /<span[^>]*>2<\/span>/)).not.toContain('aria-label');
  });
});
