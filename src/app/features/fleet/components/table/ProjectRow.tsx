'use client';

import { memo } from 'react';
import { Cell } from '@/components/table/Cell';
import { Row } from '@/components/table/Row';
import { FeedAge } from '@/components/status/FeedAge';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import { StageMeter } from '@/components/viz/StageMeter';
import { StageTicks } from '@/components/viz/StageTicks';
import { STATE_LABEL } from '@/lib/demo/labels';
import type { FleetProject, TierKey } from '@/lib/demo/types';
import { cellName, standingCount, TIER_DISPLAY_ORDER, tiersKnown, type Standing } from '@/lib/tiers';
import { columnRole } from '../../model/list/sorting';
import type { FleetMeta, FleetView } from '../../model/types';
import { ProofsCell } from './cells/ProofsCell';
import { TierCountCell } from './cells/TierCountCell';
import cells from './cells/cells.module.css';
import styles from './fleetTable.module.css';
import type { RowHandlers } from './types';

export interface ProjectRowProps {
  p: FleetProject;
  view: FleetView;
  ranked: TierKey | null;
  narrow: boolean;
  meta: FleetMeta;
  selected: boolean;
  alt: boolean;
  grouped: boolean;
  h: RowHandlers;
}

const STANDINGS: readonly Standing[] = ['no_record', 'refused'];

/** The view-dependent middle cells: tier counts, the tier of each class, or the rung of each stage. */
function MiddleCells({ p, view, ranked, narrow, meta, h }: Pick<ProjectRowProps, 'p' | 'view' | 'ranked' | 'narrow' | 'meta' | 'h'>) {
  const unwatched = p.state === 'not-set-up';
  if (view === 'tiers') {
    const apart = STANDINGS.map((s) => [s, standingCount(p, s)] as const).filter(([, n]) => n > 0);
    return TIER_DISPLAY_ORDER.map((t) => (
      <TierCountCell
        key={t}
        tier={t}
        count={p.tiers[t]}
        known={tiersKnown(p)}
        apart={t === 'quarantined' ? apart : undefined}
        role={columnRole(t, ranked)}
        narrow={narrow}
        onEnter={(e) => h.onTierEnter(e.currentTarget, p, t)}
        onLeave={h.onTierLeave}
      />
    ));
  }
  if (view === 'classes') {
    return meta.classes.map((c) => {
      const t = p.classTiers[c];
      return (
        <Cell key={c} data align="center" className={styles.cc} title={t ? `${c}: ${cellName(t)}` : undefined}>
          <TierMark tier={t} />
        </Cell>
      );
    });
  }
  return p.stages.map((r, i) => (
    <Cell key={i} data>
      {unwatched ? null : <StageMeter rung={r} showNumber />}
    </Cell>
  ));
}

/** One project: name, state, needs-you, the view's middle cells, proofs, (stages ticks,) feed age. */
export const ProjectRow = memo(function ProjectRow(props: ProjectRowProps) {
  const { p, view, meta, selected, alt, grouped, h } = props;
  const unwatched = p.state === 'not-set-up';
  const stale = p.state === 'stale';
  return (
    <Row id={p.id} selected={selected} alt={alt} stale={stale} muted={unwatched} level={grouped ? 2 : 1} onSelect={h.onSelect} onActivate={h.onActivate} onContextMenu={h.onContextMenu}>
      <Cell indent>
        <span className={`${styles.name} ${unwatched ? styles.unwatched : ''}`}>{p.name}</span>
      </Cell>
      <Cell align="center" title={STATE_LABEL[p.state]}>
        <StateGlyph state={p.state} />
      </Cell>
      <Cell align="center">{unwatched ? null : <NeedsYouBadge count={p.needsYou} variant={stale ? 'last-known' : 'live'} />}</Cell>
      <MiddleCells p={p} view={view} ranked={props.ranked} narrow={props.narrow} meta={meta} h={h} />
      <Cell data className={cells.pc}>
        {unwatched ? null : <ProofsCell proofs={p.proofs7d} />}
      </Cell>
      {view === 'tiers' ? <Cell data>{unwatched ? null : <StageTicks rungs={p.stages} labels={meta.stages} />}</Cell> : null}
      <Cell align="end">
        <FeedAge ageSec={p.feed.ageSec} ok={p.feed.ok} error={p.feed.error} />
      </Cell>
    </Row>
  );
});
