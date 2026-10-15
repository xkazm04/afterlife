'use client';

import { Button } from '@/components/controls/Button';
import type { PolicyRules } from '@/server/data/types';
import { promoteTitle, type HumanKeyRead, type Promotion } from '@/lib/promotion';
import { TIER_META } from '@/lib/tiers';
import { humanKeyWarning, WRITE_HEAD, type PromoteAsk } from '../../model/rules/promote';
import { actsFrom, isQuarantine, revokeTargets } from '../../model/rules/tiers';
import type { ActorKind, ClassRow, LedgerEntry, Tier, Track } from '../../model/types';
import { entriesFor } from '../../model/view/moves';
import type { PromoteView } from '../../write/promote';
import type { WriteView } from '../../write/revoke';
import { WhoActed } from './log/WhoActed';
import { Sec } from './Sec';
import { AllMoves } from './sections/AllMoves';
import { EnforcementSection } from './sections/EnforcementSection';
import { GrantSection } from './sections/GrantSection';
import { PromotionRule } from './sections/PromotionRule';
import { WriteSection } from './sections/WriteSection';
import styles from './inspector.module.css';

export interface ClassDetailProps {
  cls: ClassRow;
  track: Track | undefined;
  /** Live: the tracks (and so each class's proof class) are the demo catalogue's. */
  tracksDemo: boolean;
  /** Live mode (demo: the gate last seen is the demo's, read against its own clock and marked demo; the enforcement receipt is this session's simulated revoke). */
  live: boolean;
  promotion: Promotion;
  /** The human key read back on belay-policy (the class page's load); absent: not read. */
  humanKey?: HumanKeyRead;
  /** trust-policy.yml as the server read it: the grant's lease. */
  policy: PolicyRules | null;
  ledger: readonly LedgerEntry[];
  kinds: readonly ActorKind[];
  onToggleKind: (kind: ActorKind) => void;
  writeTo: Tier | null;
  viewOf: (id: string, to: Tier) => WriteView | undefined;
  /** The promotion p sends (eligible, or a quarantine's re-admission), and its write as the server planned it. */
  promote: { ask: PromoteAsk | null; view: PromoteView | undefined };
  onRevoke: (id: string, to: Tier) => void;
  onTargets: (id: string, el: HTMLElement) => void;
  onPromote: (id: string) => void;
}

/**
 * The cards of a class page: the acts, the promotion rule as counts, the write behind r, the write behind p (only when
 * the class is eligible or quarantined), the grant, where a revoke was enforced, who acted, all moves.
 */
export function ClassDetail(p: ClassDetailProps) {
  const c = p.cls;
  const from = actsFrom(c);
  const first = revokeTargets(from)[0];
  const mine = entriesFor(p.ledger, c.id);
  const eligible = p.promotion.kind === 'eligible';
  const revokeTo = p.writeTo ?? first ?? null;
  const ask = p.promote.ask;
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
            <Button variant="primary" title="Re-admit at Assisted (p): a policy MR a person merges" onClick={() => p.onPromote(c.id)}>
              Re-admit
            </Button>
          ) : null}
          {from && from !== 'human_only' && !isQuarantine(c) ? (
            <Button variant={eligible ? 'primary' : 'default'} className={eligible ? undefined : styles.off} aria-disabled={!eligible} title={promoteTitle(p.promotion)} onClick={() => p.onPromote(c.id)}>
              Promote
            </Button>
          ) : null}
        </div>
      </Sec>
      <PromotionRule promotion={p.promotion} uncounted={!!c.uncounted && !c.ask} proofDemo={p.tracksDemo && !c.ask} humanKey={p.humanKey} />
      <WriteSection head={WRITE_HEAD.revoke} keyName="r" to={revokeTo} view={revokeTo ? p.viewOf(c.id, revokeTo) : undefined} nothing="Nothing to revoke" />
      {ask ? <WriteSection head={ask.readmit ? WRITE_HEAD.readmit : WRITE_HEAD.promote} keyName="p" to={ask.to} view={p.promote.view} nothing="" warn={humanKeyWarning(p.humanKey)} /> : null}
      <GrantSection cls={c} policy={p.policy} proofClass={p.track?.proof.cls ?? ''} proofDemo={p.tracksDemo} live={p.live} />
      <EnforcementSection cls={c} live={!!p.live} />
      <Sec title="Who acted" aux={mine.length || ''} wide>
        <WhoActed entries={mine} empty={`No moves in the ledger window · ${c.lastMove}`} />
      </Sec>
      <AllMoves ledger={p.ledger} current={c.id} kinds={p.kinds} onToggleKind={p.onToggleKind} />
    </>
  );
}
