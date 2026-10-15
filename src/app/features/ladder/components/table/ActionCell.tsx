'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { Button } from '@/components/controls/Button';
import { TIER_META } from '@/lib/tiers';
import { enrollHref, promoteTitle, type Promotion } from '@/lib/promotion';
import { actsFrom, cellOf, isQuarantine, revokeTargets } from '../../model/rules/tiers';
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

/**
 * Revoke → tier split button (▾ for any lower tier) and Promote (p: the policy MR the dock shows); Re-admit (the same, at
 * Assisted) for a real quarantine only; a note for Human only and unknown, and for no record yet a link to its track's
 * Setup page, where enrollment is sent. A split class revokes from its
 * highest holder (every holder above the target moves).
 */
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
  const cell = cellOf(cls);
  if (cell === 'human_only') return <span className={styles.z}>never an agent</span>;
  if (cell === 'no_record') {
    const href = enrollHref(cls.track); // its first record is an enrollment MR, sent from the track's Setup page
    return href ? (
      <Link className={styles.z} href={href} title={`No record yet: enroll ${cls.track} in Setup (a policy MR a person merges)`}>
        no record yet · enroll ›
      </Link>
    ) : (
      <span className={styles.z}>no record yet</span>
    );
  }
  if (cell === null) return <span className={styles.z}>unknown</span>;
  if (isQuarantine(cls)) {
    return (
      <span style={{ display: 'contents' }} onMouseDown={pressSelects(cls.id, onSelect)}>
        <Button variant="primary" size="mini" tabIndex={-1} title="Re-admit at Assisted (p): sends the policy MR the dock shows; a person merges it" onClick={() => onPromote(cls.id)}>
          Re-admit
        </Button>
      </span>
    );
  }
  const first = revokeTargets(actsFrom(cls))[0];
  const eligible = promotion.kind === 'eligible';
  return (
    <span style={{ display: 'contents' }} onMouseDown={pressSelects(cls.id, onSelect)}>
      {first ? (
        <span className={styles.split}>
          <Button variant="danger" size="mini" className={`${styles.rv} ${styles.dim}`} tabIndex={-1} title="Revoke one step (r): sends the write the dock shows" aria-label={`Revoke to ${TIER_META[first].name}`} onClick={() => onRevoke(cls.id, first)}>
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
        className={`${styles.promote} ${eligible ? '' : styles.promoteOff}`}
        tabIndex={-1}
        aria-disabled={!eligible}
        title={promoteTitle(promotion)}
        onClick={() => onPromote(cls.id)}
      >
        Promote
      </Button>
    </span>
  );
}
