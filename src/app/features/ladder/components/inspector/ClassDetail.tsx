'use client';

import { Button } from '@/components/controls/Button';
import { promoteTitle, type Promotion } from '@/lib/promotion';
import { TIER_META } from '@/lib/tiers';
import { actsFrom, isQuarantine, revokeTargets } from '../../model/rules/tiers';
import type { ActorKind, ClassRow, LedgerEntry, Tier, Track } from '../../model/types';
import { entriesFor } from '../../model/view/moves';
import type { WriteView } from '../../write/revoke';
import { WhoActed } from './log/WhoActed';
import { Sec } from './Sec';
import { AllMoves } from './sections/AllMoves';
import { GrantSection } from './sections/GrantSection';
import { PromotionRule } from './sections/PromotionRule';
import { WriteSection } from './sections/WriteSection';
import styles from './inspector.module.css';

export interface ClassDetailProps {
  cls: ClassRow;
  track: Track | undefined;
  /** Live: the tracks (and so each class's proof class) are the demo catalogue's. */
  tracksDemo: boolean;
  promotion: Promotion;
  ledger: readonly LedgerEntry[];
  kinds: readonly ActorKind[];
  onToggleKind: (kind: ActorKind) => void;
  writeTo: Tier | null;
  viewOf: (id: string, to: Tier) => WriteView | undefined;
  onRevoke: (id: string, to: Tier) => void;
  onTargets: (id: string, el: HTMLElement) => void;
  onPromote: (id: string) => void;
}

/** The cards of a class page: the acts, the promotion rule as counts, the write behind r, the grant, who acted, all moves. */
export function ClassDetail(p: ClassDetailProps) {
  const c = p.cls;
  const from = actsFrom(c);
  const first = revokeTargets(from)[0];
  const mine = entriesFor(p.ledger, c.id);
  const eligible = p.promotion.kind === 'eligible';
  return (
    <>
      <Sec title="Act" aux={c.track}>
        <div className={styles.acts}>
          {first ? (
            <>
              <Button title="Revoke one step (r)" onClick={() => p.onRevoke(c.id, first)}>
                Revoke → {TIER_META[first].name}
              </Button>
              <Button title="Revoke to any lower tier" aria-haspopup="menu" onClick={(e) => p.onTargets(c.id, e.currentTarget)}>
                Take to…
              </Button>
            </>
          ) : null}
          {isQuarantine(c) ? (
            <Button href="/needs-you" variant="primary" title="Re-admit in Needs you · at Assisted at most">
              Re-admit…
            </Button>
          ) : null}
          {from && from !== 'human_only' && !isQuarantine(c) ? (
            <Button variant={eligible ? 'primary' : 'default'} className={eligible ? undefined : styles.off} aria-disabled={!eligible} title={promoteTitle(p.promotion)} onClick={() => p.onPromote(c.id)}>
              Promote
            </Button>
          ) : null}
        </div>
      </Sec>
      <PromotionRule promotion={p.promotion} uncounted={!!c.uncounted && !c.ask} proofDemo={p.tracksDemo && !c.ask} />
      <WriteSection cls={c} to={p.writeTo ?? first ?? null} viewOf={p.viewOf} />
      <GrantSection cls={c} proofClass={p.track?.proof.cls ?? ''} proofDemo={p.tracksDemo} />
      <Sec title="Who acted" aux={mine.length || ''} wide>
        <WhoActed entries={mine} empty={`No moves in the ledger window · ${c.lastMove}`} />
      </Sec>
      <AllMoves ledger={p.ledger} current={c.id} kinds={p.kinds} onToggleKind={p.onToggleKind} />
    </>
  );
}
