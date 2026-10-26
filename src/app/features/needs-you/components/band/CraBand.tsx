import { Unread } from '@/components/shell/host';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { CRA } from '../../data/cra';
import { gradeIndex } from '../../model/clock/grades';
import type { Action, NeedsState } from '../../model/types';
import { BandSide } from './BandSide';
import { Countdown } from './Countdown';
import { EvidenceStrip } from './track/EvidenceStrip';
import { GradeLadder } from './track/GradeLadder';
import { Rail24 } from './track/Rail24';
import styles from './CraBand.module.css';
import digits from './Countdown.module.css';

/**
 * The CRA legal clock: the one dominant element. Live countdown, the 24 h rail, the grade ladder (attested struck
 * out), the evidence strip and the buttons. Clicking it selects the sign-off row.
 */
export function CraBand({ s, linksResolved, dispatch }: { s: NeedsState; linksResolved: string; dispatch: (a: Action) => void }) {
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
        <Countdown signed={signed} />
        <div className={styles.bmeta}>
          {CRA.vuln} · {CRA.release} · {CRA.issue} · does not pause
        </div>
      </div>
      <div className={styles.trk}>
        <Rail24 totalSec={CRA.totalSec} awareAt={CRA.awareAt} dueClock={CRA.dueClock} signed={signed} />
        <GradeLadder current={gradeIndex(s.status.n2, linksResolved)} />
        <EvidenceStrip resolved={linksResolved} />
      </div>
      <BandSide s={s} dispatch={dispatch} />
    </section>
  );
}

/**
 * The band's box before the desk is read (the screen host's view slice): the same place and size, in quiet ink, with a
 * dash for the clock. Never the amber clock before the desk says there is one.
 */
export function CraBandPending() {
  return (
    <section className={`${styles.band} ${styles.pending}`} aria-label="CRA legal clock" aria-busy="true">
      <div>
        <div className={styles.eb}>
          <span>CRA early warning · legal clock</span>
        </div>
        <div className={digits.digits}>
          <Unread label="the clock is not read yet" />
        </div>
        <div className={styles.bmeta}>
          <Unread label="the release is not read yet" />
        </div>
      </div>
    </section>
  );
}
