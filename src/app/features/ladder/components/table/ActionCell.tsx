'use client';

import type { MouseEvent } from 'react';
import { Button } from '@/components/controls/Button';
import { TIER_META } from '@/lib/tiers';
import { promoteTitle, type Promotion } from '../../model/rules/promotion';
import { revokeTargets } from '../../model/rules/tiers';
import type { ClassRow, Tier } from '../../model/types';
import styles from './ladderTable.module.css';

/** The buttons sit in a row that selects on press: keep the press, select the row, keep focus on the table. */
function pressSelects(id: string, onSelect: (id: string) => void) {
  return (e: MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(id);
    e.currentTarget.closest<HTMLElement>('[role="treegrid"]')?.focus({ preventScroll: true });
  };
}

/** Revoke → tier split button (▾ for any lower tier) and Promote; Re-admit for Quarantined; a note for Human only. */
export function ActionCell({
  cls,
  promotion,
  onSelect,
  onRevoke,
  onTargets,
  onPromote,
}: {
  cls: ClassRow;
  promotion: Promotion;
  onSelect: (id: string) => void;
  onRevoke: (id: string, to: Tier) => void;
  onTargets: (id: string, el: HTMLElement) => void;
  onPromote: (id: string) => void;
}) {
  if (cls.tier === 'human_only') return <span className={styles.z}>never an agent</span>;
  if (cls.tier === 'quarantined') {
    return (
      <Button href="/needs-you" variant="primary" size="mini" tabIndex={-1} title="Re-admit in Needs you · at Assisted at most">
        Re-admit…
      </Button>
    );
  }
  const first = revokeTargets(cls.tier)[0];
  const eligible = promotion.kind === 'eligible';
  return (
    <span style={{ display: 'contents' }} onMouseDown={pressSelects(cls.id, onSelect)}>
      {first ? (
        <span className={styles.split}>
          <Button variant="danger" size="mini" className={`${styles.rv} ${styles.dim}`} tabIndex={-1} title="Revoke one step (r): sends the write the inspector shows" onClick={() => onRevoke(cls.id, first)}>
            Revoke → {TIER_META[first].letter}
          </Button>
          <Button
            variant="danger"
            size="mini"
            className={`${styles.dd} ${styles.dim}`}
            tabIndex={-1}
            aria-haspopup="menu"
            aria-label="More revoke targets"
            onClick={(e) => onTargets(cls.id, e.currentTarget)}
          >
            ▾
          </Button>
        </span>
      ) : null}
      <Button
        variant={eligible ? 'primary' : 'ghost'}
        size="mini"
        className={`${styles.promote} ${eligible ? '' : `${styles.promoteOff} ${styles.dim}`}`}
        tabIndex={-1}
        aria-disabled={!eligible}
        title={promoteTitle(promotion.kind)}
        onClick={() => onPromote(cls.id)}
      >
        Promote
      </Button>
    </span>
  );
}
