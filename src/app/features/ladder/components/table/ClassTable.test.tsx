// The table's header, its column tracks and a group row's cells are three hand-kept descriptions of the same columns. A
// group header must have a cell under every column, and the gate it shows must sit under "Last move".
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { GroupView } from '../../model/view/rows';
import { ClassTable } from './ClassTable';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const gate = { iid: 41, tierAtTime: 'supervised' as const, at: '2026-10-05T16:10:00.000Z' };
const group: GroupView = { id: 'T1', items: [], open: true, gate };
const none = () => undefined;
const html = renderToStaticMarkup(
  <ClassTable
    groups={[group]} grouped tracks={{ T1: { name: 'Dependencies', key: 'deps' } } as never} sort={{ key: 'name', dir: 1 }} onSort={none} sel={null} just={null}
    promotionOf={() => ({ kind: 'never' })} policy={null} empty={null} live={false} menuing={false} onSelect={none} onActivate={none} onRevoke={none}
    onTargets={none} onPromote={none} onToggleGroup={none} onRowMenu={none} onGroupMenu={none} onKeyDown={none} tableRef={null}
  />,
);
const head = html.slice(0, html.indexOf('data-part="group-row"'));
const headers = head.split('role="columnheader"').slice(1).map((c) => c.slice(c.indexOf('>') + 1).replace(/<[^>]*(>|$)/g, '').trim());
const row = html.slice(html.indexOf('data-part="group-row"'));
const cells = row.split('role="gridcell"').slice(1);

describe('the group row under the header', () => {
  it('has a cell under every column of the header, the filler included', () => {
    expect(headers.slice(0, 9)).toEqual(['Class', 'Tier', 'Ceiling', 'Lease', 'Acc', 'No-edit', 'Rv', 'Clean · 14 d', 'Last move']);
    expect(cells).toHaveLength(headers.length);
  });
  it('names every column header, the act column too (a screen reader reads its name before each row’s buttons)', () => {
    // the kit's filler track after the last column (OutlineTable's) is not one of the Ladder's columns
    const tags = [...head.matchAll(/<(?:div|button)[^>]*role="columnheader"[^>]*>/g)].map((m) => m[0]).filter((t) => !/_fill_/.test(t));
    expect(tags).toHaveLength(10);
    tags.forEach((tag, i) => expect(headers[i] || /aria-label="[^"]+"/.exec(tag)?.[0]).toBeTruthy());
  });
  it('shows the freshest gate under "Last move"', () => {
    const at = cells.findIndex((c) => c.includes('Gate last seen !41'));
    expect(headers[at]).toBe('Last move');
  });
});

describe('the empty table names only the filters that emptied it', () => {
  const empty = (crit: { src: string; filt: 'supervised' | null; q: string }) =>
    renderToStaticMarkup(
      <ClassTable
        groups={[]} grouped tracks={{} as never} sort={{ key: 'name', dir: 1 }} onSort={none} sel={null} just={null}
        promotionOf={() => ({ kind: 'never' })} policy={null} empty={crit} live={false} menuing={false} onSelect={none} onActivate={none} onRevoke={none}
        onTargets={none} onPromote={none} onToggleGroup={none} onRowMenu={none} onGroupMenu={none} onKeyDown={none} tableRef={null}
      />,
    ).replace(/<[^>]*>/g, '');
  it('a search with no match says Esc clears it, not the tier filter or the sidebar', () => {
    const out = empty({ src: 'all', filt: null, q: 'zzz' });
    expect(out).toContain('Esc clears the search');
    expect(out).not.toContain('tier filter');
    expect(out).not.toContain('sidebar');
  });
  it('a tier filter and a sidebar source each name their own way out', () => {
    expect(empty({ src: 'quar', filt: 'supervised', q: '' })).toContain('0 clears the tier filter · pick All classes in the sidebar');
    expect(empty({ src: 'all', filt: 'supervised', q: '' })).not.toContain('sidebar');
  });
});
