// The decisions table as a screen reader meets it: the group row's Stage button names the gaps it stages, in the singular
// for one. No DOM here, so the table is rendered to markup for a given state.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { visibleGroups } from '../../model/rows/grouping';
import { initialState } from '../../model/state';
import type { NeedsState } from '../../model/types';
import { DecisionsTable } from './DecisionsTable';

const demo = pickNeedsYouDemo();

const html = (s: NeedsState) =>
  renderToStaticMarkup(
    <DecisionsTable
      s={s}
      demo={demo}
      groups={visibleGroups(s, demo)}
      leftSec={3600}
      menuing={false}
      tableRef={null}
      onKeyDown={() => {}}
      dispatch={() => {}}
      onActivate={() => {}}
      onRowMenu={() => {}}
      onGroupMenu={() => {}}
    />,
  );

const picking = (...ids: string[]): NeedsState => ({ ...initialState(demo), gaps: Object.fromEntries(ids.map((id) => [id, true])) });

describe('the Stage button on the group row', () => {
  it('names one picked gap in the singular and two in the plural', () => {
    expect(html(picking('g1'))).toContain('aria-label="Stage 1 picked gap"');
    expect(html(picking('g1', 'g2'))).toContain('aria-label="Stage 2 picked gaps"');
  });

  it('is absent while no gap is picked', () => {
    expect(html(picking())).not.toMatch(/aria-label="Stage \d/);
  });
});
