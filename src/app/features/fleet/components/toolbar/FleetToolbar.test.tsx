// The view switch's tooltips name the stage count from STAGES, not a hand-typed number.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STAGES } from '@/schemas/stages';
import { FleetToolbar } from './FleetToolbar';

const noop = () => undefined;
const html = () =>
  renderToStaticMarkup(
    createElement(FleetToolbar, {
      view: 'tiers', onView: noop, projects: [], waiting: 0, compact: false, source: 'all', onSource: noop,
      sortLabel: 'Attention', onSortMenu: noop, filterCount: 0, onFilterMenu: noop, query: '', onQuery: noop, searchRef: null,
    }),
  );

describe('FleetToolbar view switch', () => {
  it('counts the stages the Stages view draws', () => {
    expect(html()).toContain(`title="Rung on each of the ${STAGES.length} stages"`);
  });
});
