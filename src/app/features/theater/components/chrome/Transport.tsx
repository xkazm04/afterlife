import type { ButtonHTMLAttributes } from 'react';
import { Kbd } from '@/components/controls/Kbd';
import { Icon } from '@/components/icons/Icon';
import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { Spacer } from '@/components/controls/Spacer';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { MAX_TAKES } from '../../model/film/fromLedger';
import { cueKeys } from '../../data/constants';
import { PREROLL_MS, PREROLL_REDUCED_MS, type Readout } from '../../model/replay/state';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import styles from './Transport.module.css';

/** A transport lozenge cell: an icon, a word and a Kbd. */
function TransportButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={styles.btn} {...props} />;
}

/**
 * Toolbar content: the transport (Play / Pause, Roll, Loop, state readout), then Present at the far end. `reduced`: the
 * viewer asked for reduced motion, so a roll pre-rolls PREROLL_REDUCED_MS, and the Roll tooltip says so.
 */
export function Transport({ playing, loop, readout, actions, onPresent, reduced = false, takes = MAX_TAKES }: { playing: boolean; loop: boolean; readout: Readout; actions: TheaterActions; onPresent: () => void; reduced?: boolean; takes?: number }) {
  const preroll = (reduced ? PREROLL_REDUCED_MS : PREROLL_MS) / 1000;
  return (
    <>
      <Lozenge label="Transport">
        <TransportButton title={`${playing ? 'Pause' : 'Play'} (space)`} onClick={actions.togglePlay}>
          <Icon name={playing ? 'pause' : 'play'} />
          {playing ? 'Pause' : 'Play'}
        </TransportButton>
        <LozengeDivider />
        <TransportButton title={`Roll the take: cue to its in-point, ${preroll} s pre-roll, play to its out-point (R)`} onClick={actions.roll}>
          <i className={styles.rec} />
          Roll <Kbd>R</Kbd>
        </TransportButton>
        <TransportButton aria-pressed={loop} title="Loop the take (L)" onClick={actions.toggleLoop}>
          <Icon name="loop" />
          Loop <Kbd>L</Kbd>
        </TransportButton>
        <LozengeDivider />
        <span className={`${styles.state} ${readout.live ? styles.live : ''}`} aria-live="polite">
          {readout.words === undefined ? (
            readout.text
          ) : (
            <>
              {readout.glyph ? <span aria-hidden="true">{readout.glyph} </span> : null}
              {readout.words}
            </>
          )}
        </span>
      </Lozenge>
      <Spacer />
      <ToolbarButton className={styles.present} title={`Present: hides all chrome; ${cueKeys(takes)}, R, L, space, ←/→ still work (F; Esc returns)`} onClick={onPresent}>
        <Icon name="present" />
        Present <Kbd>F</Kbd>
      </ToolbarButton>
    </>
  );
}
