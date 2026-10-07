'use client';

import { Button } from '@/components/controls/Button';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { TierMark } from '@/components/status/TierMark';
import { TIER_META } from '@/lib/tiers';
import type { Promotion } from '../../model/rules/promotion';
import { revokeTargets } from '../../model/rules/tiers';
import type { ActorKind, ClassRow, LedgerEntry, Tier, Track } from '../../model/types';
import { entriesFor } from '../../model/view/moves';
import type { WriteView } from '../../write/revoke';
import { WhoActed } from './log/WhoActed';
import { Sec, type SectionState } from './Sec';
import { AllMoves } from './sections/AllMoves';
import { GrantSection } from './sections/GrantSection';
import { PromotionRule } from './sections/PromotionRule';
import { WriteSection } from './sections/WriteSection';
import styles from './inspector.module.css';

export interface ClassInspectorProps {
  cls: ClassRow;
  track: Track | undefined;
  promotion: Promotion;
  byId: Readonly<Record<string, ClassRow>>;
  ledger: readonly LedgerEntry[];
  kinds: readonly ActorKind[];
  onToggleKind: (kind: ActorKind) => void;
  sections: SectionState;
  /** The records are the demo's (live mode): their counts carry a demo mark. */
  demoRecords: boolean;
  writeTo: Tier | null;
  viewOf: (id: string, to: Tier) => WriteView | undefined;
  onRevoke: (id: string, to: Tier) => void;
  onTargets: (id: string, el: HTMLElement) => void;
  onPromote: (id: string) => void;
}

/** Layer 2 of a class: who acted (to scale), the promotion rule as counts, the write behind r, the grant, all moves. */
export function ClassInspector(p: ClassInspectorProps) {
  const c = p.cls;
  const first = revokeTargets(c.tier)[0];
  const mine = entriesFor(p.ledger, c.id);
  const eligible = p.promotion.kind === 'eligible';
  return (
    <>
      <InspectorHeader
        icon={<TierMark tier={c.tier} />}
        title={<span className={styles.cidh}>{c.id}</span>}
        sub={`${c.track} ${p.track?.key ?? ''} · ${TIER_META[c.tier].name} · ceiling ${TIER_META[c.ceiling].name}`}
        path="belay-policy/tier-state.yml"
      >
        <div className={styles.acts}>
          {first ? (
            <>
              <Button title="r" onClick={() => p.onRevoke(c.id, first)}>
                Revoke → {TIER_META[first].name}
              </Button>
              <Button aria-haspopup="menu" onClick={(e) => p.onTargets(c.id, e.currentTarget)}>
                Take to…
              </Button>
            </>
          ) : null}
          {c.tier === 'quarantined' ? (
            <Button href="/needs-you" variant="primary" title="at Assisted at most">
              Re-admit…
            </Button>
          ) : null}
          {c.tier !== 'human_only' && c.tier !== 'quarantined' ? (
            <Button variant={eligible ? 'primary' : 'default'} className={eligible ? undefined : styles.off} aria-disabled={!eligible} title="p" onClick={() => p.onPromote(c.id)}>
              Promote
            </Button>
          ) : null}
        </div>
      </InspectorHeader>
      <Sec id="why" title="Who acted" aux={mine.length || ''} sections={p.sections}>
        <WhoActed entries={mine} empty={`No moves in the ledger window · ${c.lastMove}`} />
      </Sec>
      <PromotionRule promotion={p.promotion} demoRecords={p.demoRecords && !!c.record} sections={p.sections} />
      <WriteSection cls={c} to={p.writeTo ?? first ?? null} viewOf={p.viewOf} sections={p.sections} />
      <GrantSection cls={c} proofClass={p.track?.proof.cls ?? ''} sections={p.sections} />
      <AllMoves ledger={p.ledger} current={c.id} kinds={p.kinds} onToggleKind={p.onToggleKind} sections={p.sections} />
    </>
  );
}
