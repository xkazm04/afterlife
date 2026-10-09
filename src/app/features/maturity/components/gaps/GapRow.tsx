import { Checkbox } from '@/components/controls/Checkbox';
import { TierChip } from '@/components/status/TierChip';
import type { Gap } from '../../model/ctx';
import type { Phase } from '../../model/flow/credit';
import { rungText } from '../../model/rungs';
import { DemoChip } from '../chrome/DemoChip';
import { cx } from '../cx';
import { GapState } from './GapState';
import styles from './gaps.module.css';

/** One gap: pick box, id, stage, rung move, the invitation, tier (or "probe · read only"), diff size, state. */
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
}) {
  const mr = gap.x.kind === 'mr';
  return (
    <div className={cx(styles.row, alt && styles.alt, selected && styles.selected)} role="row" aria-selected={selected} onClick={() => onSelect(gap)}>
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
        <span className={styles.nm} title={gap.x.invite}>
          {gap.title}
        </span>
        <DemoChip on={live} what="This gap's invitation and files" />
      </div>
      <div className={styles.cell} role="cell">
        {mr ? <TierChip tier="assisted" /> : <span className={styles.ro}>probe · read only</span>}
      </div>
      <div className={cx(styles.cell, styles.ln)} role="cell">
        {mr ? `+${gap.diffLines}` : <span className={styles.none}>—</span>}
      </div>
      <div className={styles.cell} role="cell">
        <GapState picked={picked} phase={phase} mr={opened} />
      </div>
    </div>
  );
}
