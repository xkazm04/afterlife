// The empty body of the Fleet table names its cause: a filter that hides every project, or a fleet with none.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { makeProject } from '../../model/testProject';
import { FleetTable, type FleetTableProps } from './FleetTable';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const noop = () => undefined;
const h = { onSelect: noop, onActivate: noop, onContextMenu: noop, onToggleGroup: noop, onGroupContextMenu: noop, onTierEnter: noop, onTierLeave: noop };
const props = (over: Partial<FleetTableProps>): FleetTableProps => ({
  view: 'tiers',
  narrow: false,
  sort: { key: 'attention', dir: 1 },
  onSort: noop,
  meta: { classes: ['a'], stages: ['s'], tiers: DEMO.tiers },
  blocks: [],
  visible: [],
  grouped: false,
  collapsed: new Set(),
  selected: null,
  menuing: false,
  tableRef: { current: null },
  onKeyDown: noop,
  handlers: h,
  ...over,
});
const render = (over: Partial<FleetTableProps>) => renderToStaticMarkup(createElement(FleetTable, props(over)));

describe('FleetTable, no rows', () => {
  it('tells a filtered-out fleet to clear the search or the filters', () => {
    expect(render({ visible: [] })).toContain('No projects match. Clear the search or the filters to see the fleet.');
  });

  it('does not ask to clear filters when the fleet has no projects at all', () => {
    const out = render({ visible: [], fleetEmpty: true });
    expect(out).toContain('No projects in the fleet yet.');
    expect(out).not.toContain('Clear the search');
  });

  it('draws rows, not the empty line, when there are projects', () => {
    const out = render({ visible: [makeProject({ id: 'a' })] });
    expect(out).not.toContain('No projects');
  });
});
