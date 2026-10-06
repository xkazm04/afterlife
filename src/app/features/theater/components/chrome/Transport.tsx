import type { ButtonHTMLAttributes } from 'react';
import { Kbd } from '@/components/controls/Kbd';
import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { Spacer } from '@/components/controls/Spacer';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import type { Readout } from '../../model/replay/state';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import styles from './Transport.module.css';

// kit-candidate: TransportButton / the transport lozenge (a Lozenge cell that holds an icon, a word and a Kbd).
function TransportButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={styles.btn} {...props} />;
}

const sz = (n: number) => ({ width: `calc(${n}px * var(--ui-scale))`, height: `calc(${n}px * var(--ui-scale))` });

/** Toolbar content: the transport (Play / Pause, Roll, Loop, state readout), then Present at the far end. */
export function Transport({ playing, loop, readout, actions, onPresent }: { playing: boolean; loop: boolean; readout: Readout; actions: TheaterActions; onPresent: () => void }) {
  return (
    <>
      <Lozenge label="Transport">
        <TransportButton title="Play / pause (space)" onClick={actions.togglePlay}>
          <svg className={styles.ico} style={sz(11)} viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
            <path d={playing ? 'M2.5 1.5h2v8h-2zM6.5 1.5h2v8h-2z' : 'M2.5 1.5v8l7-4z'} />
          </svg>
          {playing ? 'Pause' : 'Play'}
        </TransportButton>
        <LozengeDivider />
        <TransportButton title="Roll the take: cue to its in-point, 2 s pre-roll, play to its out-point (R)" onClick={actions.roll}>
          <i className={styles.rec} />
          Roll <Kbd>R</Kbd>
        </TransportButton>
        <TransportButton aria-pressed={loop} title="Loop the take (L)" onClick={actions.toggleLoop}>
          <svg className={styles.ico} style={sz(12)} viewBox="0 0 13 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 6.5V5a2.5 2.5 0 0 1 2.5-2.5h7M9.5.8l2 1.7-2 1.7M11 4.5V6a2.5 2.5 0 0 1-2.5 2.5h-7M3.5 10.2l-2-1.7 2-1.7" />
          </svg>
          Loop <Kbd>L</Kbd>
        </TransportButton>
        <LozengeDivider />
        <span className={`${styles.state} ${readout.live ? styles.live : ''}`} aria-live="polite">
          {readout.text}
        </span>
      </Lozenge>
      <Spacer />
      <ToolbarButton className={styles.present} title="Present: hides all chrome; 1–8, R, L, space, ←/→ still work (F; Esc returns)" onClick={onPresent}>
        <svg className={styles.ico} style={sz(13)} viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
          <rect x=".6" y=".6" width="12.8" height="8.4" rx="1.4" />
          <path d="M4.5 11.2h5" />
        </svg>
        Present <Kbd>F</Kbd>
      </ToolbarButton>
    </>
  );
}
