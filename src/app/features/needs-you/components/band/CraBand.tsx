import { HonestyChip } from '@/components/status/HonestyChip';
import { CRA } from '../../data/cra';
import { gradeIndex } from '../../model/clock/grades';
import type { Action, NeedsState } from '../../model/types';
import { BandSide } from './BandSide';
import { Countdown } from './Countdown';
import { EvidenceStrip } from './track/EvidenceStrip';
import { GradeLadder } from './track/GradeLadder';
import { Rail24 } from './track/Rail24';
import styles from './CraBand.module.css';

/**
 * The CRA legal clock: the one dominant element. Live countdown, the 24 h rail, the grade ladder (attested struck
 * out), the evidence strip and the buttons. Clicking it selects the sign-off row.
 */
export function CraBand({ s, leftSec, linksResolved, dispatch }: { s: NeedsState; leftSec: number; linksResolved: string; dispatch: (a: Action) => void }) {
  const signed = s.status.n2 === 'sent';
  const cls = [styles.band, signed ? styles.signed : '', s.sel === 'n2' ? styles.on : ''].filter(Boolean).join(' ');
  return (
    <section className={cls} aria-label="CRA legal clock" onClick={() => dispatch({ type: 'select', id: 'n2' })}>
      <div>
        <div className={styles.eb}>
          <span>CRA early warning · legal clock</span>
          <span title="A drill on seeded data">
            <HonestyChip kind="seeded">drill · seeded</HonestyChip>
          </span>
        </div>
        <Countdown leftSec={leftSec} signed={signed} />
        <div className={styles.bmeta}>
          {CRA.vuln} · {CRA.release} · {CRA.issue} · does not pause
        </div>
      </div>
      <div className={styles.trk}>
        <Rail24 totalSec={CRA.totalSec} leftSec={leftSec} awareAt={CRA.awareAt} dueClock={CRA.dueClock} signed={signed} />
        <GradeLadder current={gradeIndex(s.status.n2)} />
        <EvidenceStrip resolved={linksResolved} />
      </div>
      <BandSide s={s} dispatch={dispatch} />
    </section>
  );
}
