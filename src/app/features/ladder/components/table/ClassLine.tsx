'use client';

import type { MouseEvent } from 'react';
import { Cell } from '@/components/table/Cell';
import { Row } from '@/components/table/Row';
import { TierMark } from '@/components/status/TierMark';
import { RungGlyph } from '@/components/viz/RungGlyph';
import { TIER_META } from '@/lib/tiers';
import type { Promotion } from '../../model/rules/promotion';
import type { ClassRow, Tier } from '../../model/types';
import { ActionCell } from './ActionCell';
import { LastMoveCell } from './LastMoveCell';
import { RecordCells } from './RecordCells';
import styles from './ladderTable.module.css';

export interface LineHandlers {
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
  onMenu: (id: string, e: MouseEvent) => void;
  onRevoke: (id: string, to: Tier) => void;
  onTargets: (id: string, el: HTMLElement) => void;
  onPromote: (id: string) => void;
}

/** One class: name, tier, rung-in-ceiling, the record, last move and the act buttons. */
export function ClassLine({
  cls,
  promotion,
  selected,
  alt,
  grouped,
  just,
  ...on
}: LineHandlers & { cls: ClassRow; promotion: Promotion; selected: boolean; alt: boolean; grouped: boolean; just: boolean }) {
  const flash = just ? styles.just : undefined;
  return (
    <Row id={cls.id} selected={selected} alt={alt} level={grouped ? 2 : 1} onSelect={on.onSelect} onActivate={on.onActivate} onContextMenu={on.onMenu}>
      <Cell indent className={flash}>
        <span className={styles.cid}>{cls.id}</span>
        {grouped ? null : <span className={styles.trk}>{cls.track}</span>}
      </Cell>
      <Cell data-tier={cls.tier} className={flash}>
        <TierMark tier={cls.tier} />
        <span className={styles.tn}>{TIER_META[cls.tier].name}</span>
      </Cell>
      <Cell className={flash}>
        <RungGlyph tier={cls.tier} ceiling={cls.ceiling} />
      </Cell>
      <RecordCells cls={cls} className={flash} />
      <Cell className={flash}>
        <LastMoveCell cls={cls} />
      </Cell>
      <Cell align="end" className={`${styles.act} ${flash ?? ''}`}>
        <ActionCell cls={cls} promotion={promotion} onSelect={on.onSelect} onRevoke={on.onRevoke} onTargets={on.onTargets} onPromote={on.onPromote} />
      </Cell>
    </Row>
  );
}
