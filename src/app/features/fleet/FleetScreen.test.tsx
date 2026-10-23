// FleetScreen fits a bookmarked list state to this fleet's columns before the list starts from it.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { loadFleetData } from './data/loadFleetData';
import { loadFleetSource } from './data/loadFleetSource';
import { FleetScreen } from './FleetScreen';
import { seen } from './model/changes/baseline';
import { decodeListState } from './model/list/urlState';

vi.mock('next/navigation', () => ({ usePathname: () => '/fleet', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
vi.mock('@/server/actions/repollAction', () => ({ repollAction: vi.fn() }));

const render = (params: Record<string, string>) =>
  renderToString(createElement(ToastProvider, null, createElement(FleetScreen, { data: loadFleetData(), source: loadFleetSource(), start: decodeListState(params) })));
const sortTitle = (html: string) => html.match(/title="Sort by ([^"]*)"/)?.[1];

describe('FleetScreen: a bookmarked sort on a column this fleet does not draw', () => {
  it('a class the fleet does not list starts on the default sort', () => {
    expect(sortTitle(render({ view: 'classes', sort: 'class:gone.class' }))).toBe(sortTitle(render({ view: 'classes' })));
  });

  it('a stage past the fleet\'s last starts on the default sort', () => {
    expect(sortTitle(render({ view: 'stages', sort: 'stage:99' }))).toBe(sortTitle(render({ view: 'stages' })));
  });

  it('a class the fleet lists keeps its sort', () => {
    const c = loadFleetData().classes[0]!;
    expect(sortTitle(render({ view: 'classes', sort: `class:${c}` }))).toBe(c);
  });
});

describe('FleetScreen: the Changed source with nothing changed', () => {
  it('says nothing moved, not that a filter hides the fleet', () => {
    const html = renderToString(
      createElement(ToastProvider, null, createElement(FleetScreen, { data: loadFleetData(), source: loadFleetSource(), start: decodeListState({ src: 'changed' }), baseline: seen(loadFleetData().projects, Date.UTC(2026, 9, 16)) })),
    );
    expect(html).toContain('Nothing moved since your last look.');
    expect(html).not.toContain('Clear the search or the filters');
  });
});
