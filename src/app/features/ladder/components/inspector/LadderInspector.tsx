'use client';

import { useState } from 'react';
import { isGroupNavId } from '@/components/table/model/rowNavigation';
import type { Promotion } from '../../model/rules/promotion';
import type { ActorKind, ClassRow, LedgerEntry, Tier, TrackMap } from '../../model/types';
import { ALL_KINDS } from '../../model/view/moves';
import { ClassInspector } from './ClassInspector';
import { GroupInspector } from './GroupInspector';
import type { SectionState } from './Sec';
import styles from './inspector.module.css';

export interface LadderInspectorProps {
  sel: string | null;
  classes: readonly ClassRow[];
  byId: Readonly<Record<string, ClassRow>>;
  tracks: TrackMap;
  ledger: readonly LedgerEntry[];
  promotionOf: (c: ClassRow) => Promotion;
  sections: SectionState;
  onRevoke: (id: string, to: Tier) => void;
  onTargets: (id: string, el: HTMLElement) => void;
  onPromote: (id: string) => void;
}

/** The inspector: a track when a group row is selected, a class otherwise. */
export function LadderInspector(p: LadderInspectorProps) {
  const [kinds, setKinds] = useState<readonly ActorKind[]>(ALL_KINDS);
  const toggleKind = (k: ActorKind) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  if (!p.sel) return <div className={styles.none}>No selection</div>;
  if (isGroupNavId(p.sel)) {
    const track = p.tracks[p.sel.slice(2)];
    return track ? <GroupInspector track={track} classes={p.classes} ledger={p.ledger} sections={p.sections} /> : null;
  }
  const cls = p.byId[p.sel];
  if (!cls) return null;
  return (
    <ClassInspector
      cls={cls}
      track={p.tracks[cls.track]}
      promotion={p.promotionOf(cls)}
      byId={p.byId}
      ledger={p.ledger}
      kinds={kinds}
      onToggleKind={toggleKind}
      sections={p.sections}
      onRevoke={p.onRevoke}
      onTargets={p.onTargets}
      onPromote={p.onPromote}
    />
  );
}
