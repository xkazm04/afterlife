'use client';

import type { MouseEvent } from 'react';
import { Cell } from '@/components/table/Cell';
import { Row } from '@/components/table/Row';
import { TierMark } from '@/components/status/TierMark';
import { RungGlyph } from '@/components/viz/RungGlyph';
import type { Promotion } from '@/lib/promotion';
import { actsFrom, cellOf, holdersOf, shownName } from '../../model/rules/tiers';
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

/**
 * One class: name, tier, rung-in-ceiling, the record, last move and the act buttons. The tier cell shows what the index
 * read: a tier, no record yet (never a quarantine), or a split class with each holder at its own tier.
 */
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
  const cell = cellOf(cls);
  const rung = actsFrom(cls);
  return (
    <Row id={cls.id} selected={selected} alt={alt} level={grouped ? 2 : 1} onSelect={on.onSelect} onActivate={on.onActivate} onContextMenu={on.onMenu}>
      <Cell indent className={flash}>
        <span className={styles.cid}>{cls.id}</span>
        {grouped ? null : <span className={styles.trk}>{cls.track}</span>}
      </Cell>
      <Cell data-tier={cell ?? 'unknown'} className={flash}>
        <TierMark tier={cell} holders={holdersOf(cls)} />
        <span className={styles.tn}>{shownName(cls)}</span>
      </Cell>
      <Cell className={flash}>{rung ? <RungGlyph tier={rung} ceiling={cls.ceiling} /> : null}</Cell>
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
