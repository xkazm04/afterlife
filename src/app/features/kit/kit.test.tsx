import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastContext } from '@/components/overlays/toast/useToast';
import { KitScreen } from './KitScreen';
import { ControlsGallery } from './components/ControlsGallery';
import { FallbackGallery } from './components/fallback/FallbackGallery';
import { OverlaysGallery } from './components/OverlaysGallery';
import { ShellGallery } from './components/ShellGallery';
import { StatusGallery } from './components/StatusGallery';
import { VizGallery } from './components/VizGallery';
import { InspectorGallery } from './components/inspector/InspectorGallery';
import { TableGallery } from './components/table/TableGallery';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/kit' }));

// The kit claims "every shared component in every state" and had 0 tests: a gallery that throws on render, or two
// specimens sharing one label (the label is the group's accessible name), went unnoticed until someone opened /kit.
const toast = { toast: () => undefined, status: () => undefined, statusMessage: '' };
const GALLERIES: [string, () => React.ReactElement][] = [
  ['status/', () => createElement(StatusGallery)],
  ['viz/', () => createElement(VizGallery)],
  ['controls/', () => createElement(ControlsGallery)],
  ['overlays/', () => createElement(OverlaysGallery, { onOpenSheet: () => undefined })],
  ['shell/ and surface/', () => createElement(ShellGallery)],
  ['table/', () => createElement(TableGallery)],
  ['fallback/ and detail/', () => createElement(FallbackGallery)],
];
const render = (el: React.ReactElement): string => renderToString(createElement(ToastContext.Provider, { value: toast }, el));
const labels = (html: string): string[] => [...html.matchAll(/role="group" aria-label="([^"]*)"/g)].map((m) => m[1] ?? '');

describe('the kit galleries', () => {
  it.each(GALLERIES)('%s renders its section with at least one specimen', (title, make) => {
    const html = render(make());
    expect(html).toContain(`>${title.replace('&', '&amp;')}`);
    if (title !== 'table/') expect(labels(html).length).toBeGreaterThan(0);
  });
  // Read from the whole /kit screen, not from the GALLERIES list above: a gallery or toolbar specimen added to KitScreen
  // alone is still checked, and the status line's section count is the screen's own.
  const screen = render(createElement(KitScreen));
  it('gives every group on the /kit screen its own label (pane galleries, inspector column and toolbar)', () => {
    const all = labels(screen);
    expect(all.length).toBeGreaterThan(GALLERIES.flatMap(([, make]) => labels(render(make()))).length);
    expect(all.filter((l, i) => all.indexOf(l) !== i)).toEqual([]);
  });
  it('counts its sections in the status line as the screen draws them', () => {
    const sections = [...screen.matchAll(/<h2[^>]*>([^<]*\/)</g)].length;
    expect(sections).toBe(GALLERIES.length);
    expect(screen).toContain(`kit gallery · ${sections} sections`);
  });
  it('gives each CommandBlock in the inspector column its own group name', () => {
    const names = labels(render(createElement(InspectorGallery))).filter((l) => l.startsWith('Command'));
    expect(names.length).toBe(3);
    expect(names.filter((l, i) => names.indexOf(l) !== i)).toEqual([]);
  });
  it('names the toolbar segmented control as a specimen, not as a gallery filter it is not', () => {
    const html = render(createElement(KitScreen));
    expect(html).toContain('aria-label="Segmented control specimen"');
    expect(html).not.toContain('Gallery view');
  });
  it('draws the inspector column', () => {
    expect(render(createElement(InspectorGallery))).toContain('UntrustedText');
  });
});
