// The decisions table as a screen reader meets it: the group row's Stage button names the gaps it stages, in the singular
// for one. No DOM here, so the table is rendered to markup for a given state.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { groupsFor, visibleGroups } from '../../model/rows/grouping';
import { initialState } from '../../model/state';
import type { GroupMode, NeedsState } from '../../model/types';
import { CRA } from '../../data/cra';
import { ClockProvider } from '../../hooks/ClockProvider';
import { clockText } from '../../model/clock/clock';
import { DecisionsTable } from './DecisionsTable';

const demo = pickNeedsYouDemo();

const html = (s: NeedsState) =>
  renderToStaticMarkup(
    <DecisionsTable
      s={s}
      demo={demo}
      groups={visibleGroups(s, demo)}
      menuing={false}
      tableRef={null}
      onKeyDown={() => {}}
      dispatch={() => {}}
      onActivate={() => {}}
      onRowMenu={() => {}}
      onGroupMenu={() => {}}
    />,
  );

const groupsAll = (mode: GroupMode, s: NeedsState) => groupsFor(mode, s).map((g) => g.id);

const picking = (...ids: string[]): NeedsState => ({ ...initialState(demo), gaps: Object.fromEntries(ids.map((id) => [id, true])) });

describe('a search that matches nothing', () => {
  it('says so in a cell of its row: a row with no cell is not a row a screen reader can enter', () => {
    const out = html({ ...initialState(demo), query: 'no such decision' });
    expect(out).toContain('No decision matches the current search or filter');
    expect(out).toMatch(/role="row"><div role="gridcell"[^>]*>No decision matches/);
  });
});

describe('the Stage button on the group row', () => {
  it('names one picked gap in the singular and two in the plural', () => {
    expect(html(picking('g1'))).toContain('aria-label="Stage 1 picked gap"');
    expect(html(picking('g1', 'g2'))).toContain('aria-label="Stage 2 picked gaps"');
  });

  it('is absent while no gap is picked', () => {
    expect(html(picking())).not.toMatch(/aria-label="Stage \d/);
  });

  it('counts only the picked gaps Afterlife has a door for: the probe alone offers no Stage', () => {
    expect(html(picking('g4'))).not.toMatch(/aria-label="Stage \d/);
    expect(html(picking('g1', 'g4'))).toContain('aria-label="Stage 1 picked gap"');
  });
});

describe('the clock cells read the shared tick', () => {
  it('shows the full window on the sign-off row and both clock group headers before the first tick', () => {
    const s = initialState(demo);
    const out = renderToStaticMarkup(
      <ClockProvider>
        <DecisionsTable s={s} demo={demo} groups={visibleGroups(s, demo)} menuing={false} tableRef={null} onKeyDown={() => {}} dispatch={() => {}} onActivate={() => {}} onRowMenu={() => {}} onGroupMenu={() => {}} />
      </ClockProvider>,
    );
    expect(out.split(clockText(CRA.remainingSec)).length - 1).toBeGreaterThanOrEqual(2);
  });
});

describe('the countdown on the group row of the sign-off', () => {
  // Collapsed, so the group header is the only place the clock can be read.
  it.each<GroupMode>(['kind', 'deadline'])('is shown in By %s mode on the group that holds the sign-off', (mode) => {
    const s = initialState(demo);
    const collapsed: NeedsState = { ...s, group: mode, collapsed: groupsAll(mode, s) };
    const out = html(collapsed);
    expect(out.split(clockText(CRA.remainingSec)).length - 1).toBe(1);
  });
});
