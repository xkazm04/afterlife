// The view switch's tooltips name the stage count from STAGES, not a hand-typed number.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STAGES } from '@/schemas/stages';
import { FleetToolbar } from './FleetToolbar';

const noop = () => undefined;
const html = (open: { sortOpen?: boolean; filterOpen?: boolean } = {}) =>
  renderToStaticMarkup(
    createElement(FleetToolbar, {
      view: 'tiers', onView: noop, projects: [], waiting: 0, compact: false, source: 'all', onSource: noop,
      sortLabel: 'Attention', onSortMenu: noop, filterCount: 0, onFilterMenu: noop, query: '', onQuery: noop, searchRef: null, ...open,
    }),
  );

describe('FleetToolbar view switch', () => {
  it('counts the stages the Stages view draws', () => {
    expect(html()).toContain(`title="Rung on each of the ${STAGES.length} stages"`);
  });
});

describe('FleetToolbar menu buttons', () => {
  it('announce each menu as collapsed while closed', () => {
    expect(html().match(/aria-expanded="false"/g)?.length).toBe(2);
  });

  it('announce only the open menu as expanded', () => {
    const out = html({ sortOpen: true });
    expect(out).toMatch(/aria-expanded="true"[^>]*title="Sort by/);
    expect(out.match(/aria-expanded="true"/g)?.length).toBe(1);
  });
});
