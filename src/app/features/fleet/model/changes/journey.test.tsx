// The journey over the real screen: an operator whose last look saw fx-rates with no decision waiting comes back to two.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { loadFleetData } from '../../data/loadFleetData';
import { loadFleetSource } from '../../data/loadFleetSource';
import { FleetScreen } from '../../FleetScreen';
import { decodeListState } from '../list/urlState';
import { digestFleet, sinceLabel } from './diff';
import { seen, type Baseline } from './baseline';

vi.mock('next/navigation', () => ({ usePathname: () => '/fleet', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
vi.mock('@/server/actions/repollAction', () => ({ repollAction: vi.fn() }));

const AT = Date.UTC(2026, 9, 16, 7, 30);
const render = (baseline: Baseline | null, src?: string) =>
  renderToString(
    createElement(ToastProvider, null, createElement(FleetScreen, { data: loadFleetData(), source: loadFleetSource(), start: decodeListState({ src }), baseline })),
  );
const lastLook = (): Baseline => {
  const digests = digestFleet(loadFleetData().projects);
  return { at: AT, digests: { ...digests, 'fx-rates': { ...digests['fx-rates']!, needsYou: 0 } } };
};
const sidebarChanged = (html: string) => html.match(/Changed since last look<\/span><span[^>]*>(\d+)</)?.[1];

describe('Fleet: what moved since your last look', () => {
  it('marks the fx-rates row and lists it under Changed since last look', () => {
    const html = render(lastLook());
    const title = `needs you +2 since ${sinceLabel(AT)}`;
    expect(html.split(`title="${title}"`)).toHaveLength(2);
    expect(html.indexOf(title)).toBeGreaterThan(html.indexOf('href="/fleet/fx-rates"'));
    expect(sidebarChanged(html)).toBe('1');
    expect(html).toContain('Mark seen');
  });

  it('the Changed source shows only that row', () => {
    const html = render(lastLook(), 'changed');
    expect(html.match(/href="\/fleet\/[^"]+"/g)).toEqual(['href="/fleet/fx-rates"']);
  });

  it('after Mark seen (this look is the baseline) the Changed count reads 0', () => {
    const html = render(seen(loadFleetData().projects, AT));
    expect(sidebarChanged(html)).toBe('0');
    expect(html).not.toMatch(/role="img" aria-label="[^"]* since /);
  });

  it('no baseline (first render, a fresh browser): no marks, count 0', () => {
    const html = render(null);
    expect(html).not.toMatch(/title="[^"]* since [^"]*"/);
    expect(sidebarChanged(html)).toBe('0');
    expect(html).not.toContain('Mark seen');
  });
});
