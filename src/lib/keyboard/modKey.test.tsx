import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The client read cannot run in a browser here, so useSyncExternalStore is replaced by a stand-in that records the
// server snapshot and returns the CLIENT one (what the hook shows after hydration). The server render itself is real.
const seen: { server: string[] } = { server: [] };
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  useSyncExternalStore: (_sub: unknown, client: () => unknown, server: () => unknown) => {
    seen.server.push(String(server()));
    return client();
  },
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/ladder' }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/link', () => ({
  default: (p: Record<string, unknown>) => createElement('a', { href: p.href }, p.children as ReactNode),
}));

const { AppNav } = await import('@/components/shell/sidebar/AppNav');
const { Window } = await import('@/components/shell/Window');
const { ToastProvider } = await import('@/components/overlays/toast/ToastProvider');
const { isApplePlatform, useModCap } = await import('./modKey');

const onPlatform = (platform: string, run: () => void) => {
  vi.stubGlobal('navigator', { platform });
  vi.stubGlobal('document', { hasFocus: () => true });
  try {
    run();
  } finally {
    vi.unstubAllGlobals();
  }
};

describe('isApplePlatform', () => {
  it.each([['MacIntel', true], ['iPhone', true], ['iPad', true], ['Win32', false], ['Linux x86_64', false], ['', false]])('%j -> %s', (p, apple) => {
    expect(isApplePlatform({ platform: p })).toBe(apple);
  });
  it('prefers the user-agent-data platform when the browser has it', () => {
    expect(isApplePlatform({ platform: 'MacIntel', userAgentData: { platform: 'Windows' } })).toBe(false);
  });
});

describe('the shell key hints', () => {
  const hints = () => ({
    nav: renderToString(createElement(AppNav)),
    win: renderToString(createElement(ToastProvider, null, createElement(Window, { title: 'x', inspector: 'i' }))),
  });

  it('say Ctrl on Windows and Linux, where every binding is Ctrl', () => {
    for (const p of ['Win32', 'Linux x86_64']) {
      onPlatform(p, () => {
        const { nav, win } = hints();
        expect(nav).toContain('>Ctrl+K</button>');
        expect(nav).toContain('aria-label="Go to anything (Ctrl+K)"');
        expect(win).toContain('title="Inspector (Ctrl+I)"');
        expect(nav + win).not.toContain('⌘');
      });
    }
  });

  it('keep the command cap on a Mac', () => {
    onPlatform('MacIntel', () => {
      const { nav, win } = hints();
      expect(nav).toContain('>⌘K</button>');
      expect(win).toContain('title="Inspector (⌘I)"');
    });
  });

  it('render the server snapshot as the command cap, so hydration matches what a Mac and the server both draw', () => {
    seen.server = [];
    onPlatform('Win32', () => {
      renderToString(createElement(() => createElement('i', null, useModCap())));
    });
    expect(seen.server).toEqual(['⌘']);
  });
});
