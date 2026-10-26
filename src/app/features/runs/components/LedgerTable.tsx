'use client';

// The runs as a ledger: the work a person judges is the lane, not the wave, so every lane of every wave is one flat,
// sortable row, its wave first and named in words, which puts the failures and the costly lanes one scan away.
// Filter by outcome, sort by a header; Enter (or a double-click) on a lane narrows the table to its wave; again, or
// Esc, shows every lane.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Cell } from '@/components/table/Cell';
import { HeaderCell } from '@/components/table/HeaderCell';
import { OutlineTable } from '@/components/table/OutlineTable';
import { Row } from '@/components/table/Row';
import { minWidth, px, range } from '@/components/table/model/columns';
import { rowDomId, type NavItem } from '@/components/table/model/rowNavigation';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { useSort } from '@/components/table/useSort';
import { Chip } from '@/components/status/chip/Chip';
import { tokens, usd, wall } from '../model/format';
import { LEDGER_INITIAL, ledgerDefaultDir, ledgerRows, ledgerView, type LedgerFilter, type LedgerKey, type LedgerRow } from '../model/ledger';
import { laneId, waveId, waveOfId } from '../model/select';
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunRepo } from '@/lib/runs/types';
import { LedgerBand } from './LedgerBand';
import { LANE_TONE, WaveState } from './WaveState';
import styles from './ledger.module.css';

/** The table's accessible name; X-ray and the guide find the table by it. */
export const LEDGER_LABEL = 'Every lane of every wave';

const COLUMNS = [px(150), range(200, 440), px(92), px(180), range(140, 300), px(76), px(76), px(76)].join(' ');

export interface LedgerTableProps {
  repos: readonly RunRepo[];
  /** The desk's merge decisions; absent until read, and the wave state says so. */
  needs?: readonly MergeNeed[];
  /** The screen's one selection, a lane id (model/select.ts): the merge card follows its wave. */
  selected: string | null;
  onSelect: (id: string) => void;
}

export function LedgerTable({ repos, needs, selected, onSelect }: LedgerTableProps) {
  const all = useMemo(() => ledgerRows(repos), [repos]);
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [only, setOnly] = useState<string | null>(null);
  const { sort, toggle } = useSort<LedgerKey>({ initial: LEDGER_INITIAL, defaultDir: ledgerDefaultDir });
  const narrowed = only ? waveOfId(repos, only) : undefined;
  const rows = useMemo(() => ledgerView(all, filter, sort, narrowed), [all, filter, sort, narrowed]);
  const tableRef = useRef<HTMLDivElement>(null);

  const idOf = (r: LedgerRow) => laneId(r.wave, r.lane);
  const items = useMemo<NavItem[]>(() => rows.map((r) => ({ id: laneId(r.wave, r.lane), kind: 'row' })), [rows]);
  const activate = (id: string) => {
    const w = waveOfId(repos, id);
    setOnly((o) => (o || !w ? null : waveId(w)));
  };
  const nav = useRowNavigation({ items, selected, onSelect, tableRef, onActivate: activate, onToggleGroup: () => {} });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && only && e.target === e.currentTarget) {
      setOnly(null);
      e.preventDefault();
      return;
    }
    nav(e);
  };
  const head = (k: LedgerKey, label: string, align?: 'end') => (
    <HeaderCell sortKey={k} sort={sort} onSort={toggle} align={align}>
      {label}
    </HeaderCell>
  );

  return (
    <div className={styles.root}>
      <LedgerBand rows={all} filter={filter} onFilter={setFilter} wave={narrowed} needs={needs} onClear={() => setOnly(null)} />
      <div className={styles.body}>
        <OutlineTable
          label={LEDGER_LABEL}
          columns={COLUMNS}
          minWidth={minWidth(990)}
          flat
          tableRef={tableRef}
          onKeyDown={onKeyDown}
          activeId={selected ? rowDomId(selected) : undefined}
          header={
            <>
              {head('wave', 'Wave')}
              {head('title', 'Lane')}
              {head('outcome', 'Outcome')}
              <HeaderCell>Wave state</HeaderCell>
              <HeaderCell>Why / commits</HeaderCell>
              {head('tokens', 'Tokens', 'end')}
              {head('cost', 'Cost', 'end')}
              {head('wall', 'Wall', 'end')}
            </>
          }
        >
          {rows.map((r, i) => (
            <LedgerLine key={idOf(r)} r={r} needs={needs} alt={i % 2 === 1} selected={selected === idOf(r)} onSelect={onSelect} onActivate={activate} />
          ))}
        </OutlineTable>
      </div>
    </div>
  );
}

function LedgerLine({ r, needs, alt, selected, onSelect, onActivate }: { r: LedgerRow; needs?: readonly MergeNeed[]; alt: boolean; selected: boolean; onSelect: (id: string) => void; onActivate: (id: string) => void }) {
  const { lane: l, wave: w } = r;
  const detail = l.parkReason ?? (l.commits ? `${l.commits.length} commit${l.commits.length === 1 ? '' : 's'}` : '-');
  return (
    <Row id={laneId(w, l)} level={1} alt={alt} selected={selected} onSelect={onSelect} onActivate={onActivate}>
      <Cell indent title={`${w.repo}, wave ${w.wave}${w.branch ? `, ${w.branch}` : ''}`}>
        <span className={styles.repo}>{w.repo}</span>
        <span className={styles.wave}>{w.wave}</span>
      </Cell>
      <Cell title={l.title ? `${l.title} (${l.lane})` : l.lane}>
        <span className={styles.title}>{l.title ?? l.lane}</span>
      </Cell>
      <Cell>{l.outcome ? <Chip compact tone={LANE_TONE[l.outcome]}>{l.outcome}</Chip> : <Chip compact tone="pending">running</Chip>}</Cell>
      <Cell>
        <WaveState w={w} needs={needs} />
      </Cell>
      <Cell title={l.parkReason}>
        <span className={l.parkReason ? styles.why : styles.dim}>{detail}</span>
      </Cell>
      <Cell align="end">{tokens(l.tokens)}</Cell>
      <Cell align="end">{usd(l.costUsd)}</Cell>
      <Cell align="end">{wall(l.wallSec)}</Cell>
    </Row>
  );
}
