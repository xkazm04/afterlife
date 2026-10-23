import { Button } from '@/components/controls/Button';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { Phase } from '../../model/flow/credit';
import { nextMove, type MoveAction } from '../../model/flow/moves';
import type { Gap } from '../../model/ctx';
import { cx } from '../cx';
import styles from './gaps.module.css';

/**
 * Where a gap is: picked (waits for you), or, once sent, opened → merged → ran → no lift or credited. With `onAct`, a sent
 * gap also carries its next move (the stage page's own, simulated); the click stays off the row, so it does not select it.
 */
export function GapState({ gap, picked, phase, mr, onAct }: { gap?: Gap; picked: boolean; phase: Phase | undefined; mr: string; onAct?: (a: MoveAction) => void }) {
  const state = <PhaseText picked={picked} phase={phase} mr={mr} tag={gap?.x.runsOn === 'tag'} />;
  const move = gap && phase && onAct ? nextMove(phase, gap) : null;
  if (!move || !onAct) return state;
  const act = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onAct(move.action);
  };
  return (
    <span className={styles.act}>
      {state}
      <Button size="mini" title={`${move.label} · ${move.action.id} (simulated)`} onClick={act}>
        {move.label}
      </Button>
      <HonestyChip kind="simulated" />
    </span>
  );
}

/** `tag`: the job runs in the tagged release pipeline, not on main (the stage lede and the ran notice word it so too). */
function PhaseText({ picked, phase, mr, tag }: { picked: boolean; phase: Phase | undefined; mr: string; tag: boolean }) {
  if (!phase) return picked ? <span className={cx(styles.st, styles.picked)}>● picked</span> : <span className={styles.none}>—</span>;
  switch (phase) {
    case 'probed':
      return <span className={styles.st}>probed · read only</span>;
    case 'opened':
      return <span className={cx(styles.st, styles.open)}>{mr} opened</span>;
    case 'merged':
      return <span className={cx(styles.st, styles.merged)}>{mr} merged</span>;
    case 'ran':
      return <span className={cx(styles.st, styles.merged)}>{mr} {tag ? 'ran in the tagged release' : 'ran on main'}</span>;
    case 'nolift':
      return (
        <span className={cx(styles.st, styles.nolift)} title="configured, not exercised">
          ✗ {mr} no lift
        </span>
      );
    case 'credited':
      return <span className={cx(styles.st, styles.credited)}>✓ {mr} credited</span>;
  }
}
