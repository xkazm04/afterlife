import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { AppFrame } from '../frame/AppFrame';
import { ShellLoading } from './ShellLoading';

let path = '/fleet';
vi.mock('next/navigation', () => ({ usePathname: () => path }));
vi.mock('next/image', () => ({ default: (p: { src: string }) => createElement('img', { src: p.src }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));

// (app)/loading.tsx draws this on every windowed route while its data streams in: the real window, titled from the
// route, with one busy status region in the pane. Rendered here outside the (app) layout, it brings its own frame.
const render = (at: string) => {
  path = at;
  return renderToString(<ToastProvider><ShellLoading /></ToastProvider>);
};

describe('ShellLoading', () => {
  it('titles the window from the nav entry the route is in, sub-paths included', () => {
    expect(render('/fleet')).toMatch(/<b>Fleet<\/b>/);
    expect(render('/ladder/core')).toMatch(/<b>Ladder<\/b>/);
    expect(render('/settings/keyboard')).toMatch(/<b>Settings<\/b>/);
  });
  it('falls back to the app name on a route outside the nav', () => {
    expect(render('/nowhere')).toMatch(/<b>Afterlife<\/b>/);
  });
  it('says it is loading, once, as a busy status region named for the screen', () => {
    const html = render('/monitor');
    expect(html.match(/aria-busy="true"/g)?.length).toBe(1); // the other role="status" is the toast region
    expect(html).toMatch(/role="status" aria-busy="true" aria-label="Loading Monitor"/);
    expect(html).toContain('Loading…');
  });
  it('inside the frame adds no second sidebar: the frame has the one', () => {
    path = '/fleet';
    const html = renderToString(<ToastProvider><AppFrame><ShellLoading /></AppFrame></ToastProvider>);
    expect(html.match(/aria-label="Sources"/g)).toHaveLength(1);
    expect(html).toMatch(/<b>Fleet<\/b>/);
  });
});
