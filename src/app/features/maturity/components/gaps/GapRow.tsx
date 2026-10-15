import Link from 'next/link';
import { Checkbox } from '@/components/controls/Checkbox';
import { TierChip } from '@/components/status/TierChip';
import type { Gap } from '../../model/ctx';
import type { Phase } from '../../model/flow/credit';
import type { MoveAction } from '../../model/flow/moves';
import { rungText } from '../../model/rungs';
import { DemoChip } from '../chrome/DemoChip';
import { cx, onActivate } from '../cx';
import { GapState } from './GapState';
import styles from './gaps.module.css';

/** One gap: pick box, id, stage, rung move, the invitation, tier (or "probe · read only"), diff size, state and next move. */
export function GapRow({
  gap,
  picked,
  phase,
  mr: opened,
  selected,
  alt,
  live,
  onPick,
  onSelect,
  onOpen,
  onAct,
}: {
  gap: Gap;
  picked: boolean;
  phase: Phase | undefined;
  /** The MR GitLab named for it, once sent. */
  mr: string;
  selected: boolean;
  alt: boolean;
  live: boolean;
  onPick: (id: string) => void;
  onSelect: (gap: Gap) => void;
  onOpen: (gap: Gap) => void;
  /** A sent gap's next move, from its row (simulated). */
  onAct: (a: MoveAction) => void;
}) {
  const mr = gap.x.kind === 'mr';
  return (
    <div className={cx(styles.row, alt && styles.alt, selected && styles.selected)} role="row"
      tabIndex={0}
      aria-selected={selected}
      onClick={() => onSelect(gap)}
      onKeyDown={(e) => e.target === e.currentTarget && onActivate(() => onOpen(gap))(e)}
    >
      <div className={cx(styles.cell, styles.ctr)} role="cell" onClick={(e) => e.stopPropagation()}>
        {phase ? <span className={styles.none}>–</span> : <Checkbox checked={picked} onChange={() => onPick(gap.id)} label={`Pick gap ${gap.id}`} />}
      </div>
      <div className={cx(styles.cell, styles.id)} role="cell">
        {gap.id}
      </div>
      <div className={cx(styles.cell, styles.stage)} role="cell">
        {gap.stage}
      </div>
      <div className={styles.cell} role="cell">
        <span className={styles.mv}>{`${rungText(gap.from)} → ${rungText(gap.to)}`}</span>
      </div>
      <div className={cx(styles.cell, styles.ttl)} role="cell">
        <Link className={styles.nm} href={`/maturity/${encodeURIComponent(gap.stage)}`} title={`${gap.x.invite} · open the ${gap.stage} page (↵)`}>
          {gap.title}
        </Link>
        <DemoChip on={live} what="This gap's invitation and files" />
      </div>
      <div className={styles.cell} role="cell">
        {mr ? <TierChip tier="assisted" /> : <span className={styles.ro}>probe · read only</span>}
      </div>
      <div className={cx(styles.cell, styles.ln)} role="cell">
        {mr ? `+${gap.diffLines}` : <span className={styles.none}>—</span>}
      </div>
      <div className={styles.cell} role="cell">
        <GapState gap={gap} picked={picked} phase={phase} mr={opened} onAct={onAct} />
      </div>
    </div>
  );
}
