import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeElement } from './fakeDom';

vi.mock('next/navigation', () => ({ usePathname: () => '/fleet' }));
vi.mock('next/image', () => ({ default: (p: { src: string }) => createElement('img', { src: p.src }) }));
vi.mock('next/link', () => ({
  default: (p: Record<string, unknown>) => {
    const { children, href } = p;
    return createElement('a', { href }, children as ReactNode);
  },
}));

// react-dom reads the DOM's presence when it loads, so the fake one goes in before it does.
const { container, document } = installFakeDom();
const { act, Activity, useEffect } = await import('react');
const { createRoot } = await import('react-dom/client');
const { ToastProvider } = await import('@/components/overlays/toast/ToastProvider');
const { SidebarSection } = await import('../sidebar/SidebarSection');
const { Window } = await import('../Window');
const { AppFrame } = await import('./AppFrame');
const { useFrame } = await import('./FrameContext');

/** The frame as the screens see it, read after each commit. */
const probe: { frame: ReturnType<typeof useFrame> } = { frame: null };
function Probe() {
  const f = useFrame();
  useEffect(() => {
    probe.frame = f;
  });
  return null;
}

/** The (app) layout around one screen: the same AppFrame element, children swapped as a navigation swaps the page. */
const route = (screen: ReactNode) => (
  <ToastProvider>
    <AppFrame>
      <Probe />
      {screen}
    </AppFrame>
  </ToastProvider>
);
const el = (pred: (e: FakeElement) => boolean) => (container as unknown as FakeElement).all().find(pred);
const sidebar = () => el((e) => e.tagName === 'aside' && e.getAttribute('aria-label') === 'Sources');
const button = (label: string) => el((e) => e.tagName === 'button' && e.getAttribute('aria-label') === label);
const text = () => (container as unknown as FakeElement).textContent;

describe('AppFrame across a navigation', () => {
  it('keeps the same Sidebar node and its collapsed state, and swaps only the screen and its sidebar sections', async () => {
    const root = createRoot(container as unknown as HTMLElement);
    const fleet = <Window title="Fleet" sidebar={<SidebarSection title="Fleet filters">x</SidebarSection>}>fleet pane</Window>;
    await act(async () => root.render(route(fleet)));
    const side = sidebar();
    expect(side).toBeDefined();
    expect(text()).toContain('Fleet filters'); // the screen's section, portalled into the frame's sidebar
    expect(text()).toContain('fleet pane');

    await act(async () => probe.frame?.setSideOpen(false));
    expect(button('Show sidebar')).toBeDefined();

    const ladder = <Window title="Ladder" sidebar={<SidebarSection title="Ladder tiers">y</SidebarSection>}>ladder pane</Window>;
    await act(async () => root.render(route(ladder)));
    expect(sidebar()).toBe(side); // not remounted: the same DOM node
    expect(probe.frame?.sideOpen).toBe(false); // the collapse survives the navigation
    expect(button('Show sidebar')).toBeDefined(); // and the new screen's toolbar offers to show it again
    expect(text()).toContain('Ladder tiers');
    expect(text()).not.toContain('Fleet filters'); // the old screen's sections left with it
    expect(text()).not.toContain('fleet pane');
    await act(async () => root.unmount());
  });
});

describe('two screens mounted at once (a route kept hidden in <Activity>)', () => {
  it('renders no id twice, and each inspector toggle controls its own inspector', () => {
    const html = renderToString(
      <ToastProvider>
        <AppFrame>
          <Window title="Fleet" inspector={<i>a</i>} />
          <Window title="Ladder" inspector={<i>b</i>} />
        </AppFrame>
      </ToastProvider>,
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ids).size).toBe(ids.length);
    const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
    expect(controls).toHaveLength(2);
    for (const c of controls) expect(ids).toContain(c);
  });

  it('draws one sidebar for the frame, not one per screen', () => {
    const html = renderToString(
      <ToastProvider>
        <AppFrame>
          <Window title="Fleet" />
          <Window title="Ladder" />
        </AppFrame>
      </ToastProvider>,
    );
    expect(html.match(/aria-label="Sources"/g)).toHaveLength(1);
    expect(html.match(/<main[\s>]/g)).toHaveLength(2);
  });
});

describe('a screen hidden in <Activity>', () => {
  // Cache Components keeps a visited route in <Activity mode="hidden">; hiding runs its effects' cleanups (Next's
  // preserving-ui-state guide), and the shell's hotkeys are effects (lib/keyboard/useHotkeys), so they stop with it.
  it('stops listening for its hotkeys while hidden and listens again when shown', async () => {
    const root = createRoot(container as unknown as HTMLElement);
    const keys = () => document.listeners.get('keydown')?.size ?? 0;
    const at = (mode: 'visible' | 'hidden') => route(<Activity mode={mode}><Window title="Fleet" inspector={<i>a</i>} /></Activity>);
    await act(async () => root.render(route(null)));
    const base = keys();
    await act(async () => root.render(at('visible')));
    expect(keys()).toBeGreaterThan(base);
    await act(async () => root.render(at('hidden')));
    expect(keys()).toBe(base);
    await act(async () => root.render(at('visible')));
    expect(keys()).toBeGreaterThan(base);
    await act(async () => root.unmount());
  });
});
