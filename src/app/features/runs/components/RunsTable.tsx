'use client';

import { useMemo, useRef, useState } from 'react';
import { HeaderCell } from '@/components/table/HeaderCell';
import { OutlineTable } from '@/components/table/OutlineTable';
import { RowGroup } from '@/components/table/RowGroup';
import { GroupRow } from '@/components/table/GroupRow';
import { Row } from '@/components/table/Row';
import { Cell } from '@/components/table/Cell';
import { px, minWidth } from '@/components/table/model/columns';
import { groupNavId, isGroupNavId, rowDomId, type NavItem } from '@/components/table/model/rowNavigation';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { Chip } from '@/components/status/chip/Chip';
import { outcomeWords, pct, spanSec, tokens, usd, wall } from '../model/format';
import type { RunLane, RunRepo, RunWave } from '@/lib/runs/types';
import { LANE_TONE, WaveState } from './WaveState';

const COLUMNS = [260, 130, 190, 220, 80, 80, 80, 110].map(px).join(' ');
export const waveId = (w: RunWave): string => `w:${w.repo}:${w.wave}`;
const laneId = (w: RunWave, l: RunLane): string => `l:${w.repo}:${w.wave}:${l.lane}`;

/** Repos as groups, waves as rows, a wave's lanes under it once opened (Enter or double-click). The selected wave is the screen's. */
export function RunsTable({ repos, selected, onSelect }: { repos: readonly RunRepo[]; selected: string | null; onSelect: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);
  const flip = (s: ReadonlySet<string>, k: string, on?: boolean): Set<string> => {
    const n = new Set(s);
    if (on === undefined ? n.has(k) : !on) n.delete(k);
    else n.add(k);
    return n;
  };
  const toggleWave = (id: string) => isGroupNavId(id) || id.startsWith('l:') || setOpened((s) => flip(s, id));

  const items = useMemo<NavItem[]>(
    () =>
      repos.flatMap((r) => {
        const g = groupNavId(r.repo);
        const open = !collapsed.has(r.repo);
        const rows: NavItem[] = [{ id: g, kind: 'group', expanded: open }];
        if (open) for (const w of r.waves) rows.push({ id: waveId(w), kind: 'row', parent: g }, ...(opened.has(waveId(w)) ? w.lanes.map((l): NavItem => ({ id: laneId(w, l), kind: 'row', parent: g })) : []));
        return rows;
      }),
    [repos, collapsed, opened],
  );
  const onKeyDown = useRowNavigation({
    items, selected, onSelect, tableRef, grouped: true, onActivate: toggleWave,
    onToggleGroup: (repo, open) => setCollapsed((s) => flip(s, repo, !open)),
  });

  return (
    <OutlineTable
      label="Runs by repo and wave"
      columns={COLUMNS}
      minWidth={minWidth(950)}
      tableRef={tableRef}
      onKeyDown={onKeyDown}
      activeId={selected ? rowDomId(selected) : undefined}
      header={
        <>
          <HeaderCell>Wave / lane</HeaderCell>
          <HeaderCell>State</HeaderCell>
          <HeaderCell>Branch / model</HeaderCell>
          <HeaderCell>Outcomes / detail</HeaderCell>
          <HeaderCell align="end">Tokens</HeaderCell>
          <HeaderCell align="end">Cost</HeaderCell>
          <HeaderCell align="end">Wall</HeaderCell>
          <HeaderCell>Prompt</HeaderCell>
        </>
      }
    >
      {repos.map((r) => (
        <RowGroup key={r.repo}>
          <GroupRow id={r.repo} label={r.repo} count={r.waves.length} expanded={!collapsed.has(r.repo)} selected={selected === groupNavId(r.repo)} onSelect={onSelect} onToggle={(id) => setCollapsed((s) => flip(s, id))}>
            <Cell />
            <Cell />
            <Cell>{pct(r.totals.landedPct)} landed</Cell>
            <Cell align="end">{tokens(r.totals.tokens)}</Cell>
            <Cell align="end">{usd(r.totals.costUsd)}</Cell>
            <Cell />
            <Cell />
          </GroupRow>
          {collapsed.has(r.repo) ? null : r.waves.flatMap((w, i) => [
            <WaveRow key={waveId(w)} w={w} alt={i % 2 === 1} selected={selected === waveId(w)} onSelect={onSelect} onActivate={toggleWave} />,
            ...(opened.has(waveId(w)) ? w.lanes.map((l) => <LaneRow key={laneId(w, l)} id={laneId(w, l)} l={l} selected={selected === laneId(w, l)} onSelect={onSelect} />) : []),
          ])}
        </RowGroup>
      ))}
    </OutlineTable>
  );
}

function WaveRow({ w, alt, selected, onSelect, onActivate }: { w: RunWave; alt: boolean; selected: boolean; onSelect: (id: string) => void; onActivate: (id: string) => void }) {
  return (
    <Row id={waveId(w)} alt={alt} selected={selected} onSelect={onSelect} onActivate={onActivate}>
      <Cell indent>Wave {w.wave}{w.hasProposals ? <Chip compact tone="accent" title={`${w.wave}.proposals.md sits next to the events`}>proposals</Chip> : null}</Cell>
      <Cell><WaveState w={w} /></Cell>
      <Cell title={w.model}>{w.branch ?? w.model ?? '-'}</Cell>
      <Cell>{outcomeWords(w.counts, w.open)}</Cell>
      <Cell align="end">{tokens(w.tokens)}</Cell>
      <Cell align="end">{usd(w.costUsd)}</Cell>
      <Cell align="end">{wall(spanSec(w.startedAt, w.endedAt))}</Cell>
      <Cell>{w.promptVersion ?? '-'}</Cell>
    </Row>
  );
}

function LaneRow({ id, l, selected, onSelect }: { id: string; l: RunLane; selected: boolean; onSelect: (id: string) => void }) {
  const detail = l.parkReason ?? (l.commits ? `${l.commits.length} commit${l.commits.length === 1 ? '' : 's'}` : '-');
  return (
    <Row id={id} selected={selected} onSelect={onSelect} muted>
      <Cell indent title={l.title}>{l.title ?? l.lane}</Cell>
      <Cell>{l.outcome ? <Chip compact tone={LANE_TONE[l.outcome]}>{l.outcome}</Chip> : <Chip compact tone="pending">running</Chip>}</Cell>
      <Cell>{l.model ?? '-'}</Cell>
      <Cell title={l.parkReason}>{detail}</Cell>
      <Cell align="end">{tokens(l.tokens)}</Cell>
      <Cell align="end">{usd(l.costUsd)}</Cell>
      <Cell align="end">{wall(l.wallSec)}</Cell>
      <Cell>{l.promptVersion}</Cell>
    </Row>
  );
}
