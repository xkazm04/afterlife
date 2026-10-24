// The sidebar names each source as the toolbar subtitle does (sourceLabel): one wording per source, never a re-typed copy.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { makeProject } from '../../model/testProject';
import { sourceLabel } from '../../model/list/filtering';
import { SMART_FILTERS } from '../../model/list/smartFilters';
import type { Source } from '../../model/types';
import { FleetSidebar } from './FleetSidebar';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const labels = (html: string) => [...html.matchAll(/<span class="[^"]*lb[^"]*">([^<]*)<\/span>/g)].map((m) => m[1]);

describe('FleetSidebar', () => {
  it('labels every source it offers with sourceLabel, the toolbar subtitle\'s words', () => {
    const groups = ['core', 'payments'];
    const html = renderToStaticMarkup(
      createElement(FleetSidebar, { projects: [makeProject({ id: 'a' })], groups, source: 'all', onSource: () => undefined, changed: 0, onMarkSeen: () => undefined }),
    );
    const sources: Source[] = ['all', 'changed', ...groups.map((g): Source => `g:${g}`), ...SMART_FILTERS.map((s) => s.id)];
    expect(labels(html)).toEqual(sources.map(sourceLabel));
  });
});
