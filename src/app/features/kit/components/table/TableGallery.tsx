'use client';

import { useMemo, useRef, useState } from 'react';
import { Cell } from '@/components/table/Cell';
import { GroupRow } from '@/components/table/GroupRow';
import { HeaderCell } from '@/components/table/HeaderCell';
import { OutlineTable } from '@/components/table/OutlineTable';
import { Row } from '@/components/table/Row';
import { RowGroup } from '@/components/table/RowGroup';
import { groupNavId, rowDomId, type NavItem } from '@/components/table/model/rowNavigation';
import { minWidth, px, range } from '@/components/table/model/columns';
import { sortItems } from '@/components/table/model/sort';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { useSort } from '@/components/table/useSort';
import { FeedAge } from '@/components/status/FeedAge';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { ProofBar } from '@/components/viz/ProofBar';
import { StageTicks } from '@/components/viz/StageTicks';
import { getProjects, type FleetProject } from '@/lib/demo';
import { GallerySection } from '../GallerySection';
import styles from './TableGallery.module.css';

type Key = 'name' | 'needs' | 'feed';
const COLS = [range(150, 240), px(30), px(48), px(96), px(96), px(56)].join(' ');
const GROUPS = ['core-banking', 'payments'];
const ALL = getProjects();

/** A working OutlineTable: sortable headers, two groups, stale and unwatched rows, keys and selection. */
export function TableGallery() {
  const { sort, toggle } = useSort<Key>({ initial: { key: 'name', dir: 1 }, defaultDir: (k) => (k === 'name' ? 1 : -1) });
  const [selected, setSelected] = useState<string | null>('ledgerline');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(
    () =>
      GROUPS.map((g) => {
        const rows = ALL.filter((p) => p.group === g).slice(0, g === 'payments' ? 4 : 12);
        const sorted = sortItems<FleetProject, Key>(rows, sort, {
          getValue: (p, k) => (k === 'name' ? p.name : k === 'needs' ? (p.state === 'not-set-up' ? null : p.needsYou) : p.feed.ageSec),
          tiebreak: (a, b) => a.name.localeCompare(b.name),
        });
        return { id: g, rows: sorted, open: !collapsed.has(g) };
      }),
    [sort, collapsed],
  );
  const items: NavItem[] = groups.flatMap((g) => [
    { id: groupNavId(g.id), kind: 'group' as const, expanded: g.open },
    ...(g.open ? g.rows.map((p) => ({ id: p.id, kind: 'row' as const, parent: groupNavId(g.id) })) : []),
  ]);
  const flip = (g: string, open?: boolean) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (open === undefined ? n.has(g) : open) n.delete(g);
      else n.add(g);
      return n;
    });
  const onKeyDown = useRowNavigation({
    items,
    selected,
    onSelect: setSelected,
    onToggleGroup: (g, open) => flip(g, open),
    tableRef,
    grouped: true,
  });

  return (
    <GallerySection title="table/ (click headers to sort, arrow keys, left/right on groups)">
      <div className={styles.box}>
        <OutlineTable
          label="Demo projects"
          columns={COLS}
          minWidth={minWidth(520)}
          tableRef={tableRef}
          activeId={selected ? rowDomId(selected) : undefined}
          onKeyDown={onKeyDown}
          header={
            <>
              <HeaderCell sortKey="name" sort={sort} onSort={toggle}>
                Project
              </HeaderCell>
              <HeaderCell align="center" tip="State">
                ○
              </HeaderCell>
              <HeaderCell sortKey="needs" sort={sort} onSort={toggle} align="center" tip="Needs you">
                ◆
              </HeaderCell>
              <HeaderCell>Proofs</HeaderCell>
              <HeaderCell>Stages</HeaderCell>
              <HeaderCell sortKey="feed" sort={sort} onSort={toggle} align="end">
                Feed
              </HeaderCell>
            </>
          }
        >
          {groups.map((g) => (
            <RowGroup key={g.id}>
              <GroupRow id={g.id} label={g.id} count={g.rows.length} expanded={g.open} selected={selected === groupNavId(g.id)} onSelect={setSelected} onToggle={(id) => flip(id)}>
                <Cell />
                <Cell align="center">
                  <NeedsYouBadge count={g.rows.reduce((a, p) => a + (p.state === 'not-set-up' ? 0 : p.needsYou), 0)} variant="group" />
                </Cell>
                <Cell />
                <Cell />
                <Cell />
              </GroupRow>
              {g.open
                ? g.rows.map((p, i) => (
                    <Row key={p.id} id={p.id} alt={i % 2 === 1} selected={selected === p.id} stale={p.state === 'stale'} muted={p.state === 'not-set-up'} onSelect={setSelected}>
                      <Cell indent title={p.name}>
                        <span className={styles.nm}>{p.name}</span>
                      </Cell>
                      <Cell align="center">
                        <StateGlyph state={p.state} />
                      </Cell>
                      <Cell align="center">
                        <NeedsYouBadge count={p.state === 'not-set-up' ? 0 : p.needsYou} variant={p.state === 'stale' ? 'last-known' : 'live'} />
                      </Cell>
                      <Cell data>{p.state === 'not-set-up' ? null : <ProofBar proofs={p.proofs7d} />}</Cell>
                      <Cell data>{p.state === 'not-set-up' ? null : <StageTicks rungs={p.stages} />}</Cell>
                      <Cell align="end">
                        <FeedAge ageSec={p.feed.ageSec} ok={p.feed.ok} error={p.feed.error} />
                      </Cell>
                    </Row>
                  ))
                : null}
            </RowGroup>
          ))}
        </OutlineTable>
      </div>
    </GallerySection>
  );
}
