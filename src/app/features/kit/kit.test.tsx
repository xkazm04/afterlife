import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastContext } from '@/components/overlays/toast/useToast';
import { ControlsGallery } from './components/ControlsGallery';
import { OverlaysGallery } from './components/OverlaysGallery';
import { ShellGallery } from './components/ShellGallery';
import { StatusGallery } from './components/StatusGallery';
import { VizGallery } from './components/VizGallery';
import { InspectorGallery } from './components/inspector/InspectorGallery';
import { TableGallery } from './components/table/TableGallery';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

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
];
const render = (el: React.ReactElement): string => renderToString(createElement(ToastContext.Provider, { value: toast }, el));
const labels = (html: string): string[] => [...html.matchAll(/role="group" aria-label="([^"]*)"/g)].map((m) => m[1] ?? '');

describe('the kit galleries', () => {
  it.each(GALLERIES)('%s renders its section with at least one specimen', (title, make) => {
    const html = render(make());
    expect(html).toContain(`>${title.replace('&', '&amp;')}`);
    if (title !== 'table/') expect(labels(html).length).toBeGreaterThan(0);
  });
  it('gives every specimen across the five specimen galleries its own label (the pane galleries use Specimen; the inspector column does not)', () => {
    const all = GALLERIES.flatMap(([, make]) => labels(render(make())));
    expect(all.length).toBeGreaterThan(30);
    expect(all.filter((l, i) => all.indexOf(l) !== i)).toEqual([]);
  });
  it('draws the inspector column', () => {
    expect(render(createElement(InspectorGallery))).toContain('UntrustedText');
  });
});
