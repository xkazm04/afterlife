'use client';

import { autoAdvances } from '../model/playback';
import { STEPS } from '../model/steps';
import { entryOf, guideStore, type GuideState } from '../model/store';
import { Rail } from './Rail';
import styles from './dock.module.css';

const N = STEPS.length;
const send = guideStore.send;

/**
 * The guide's dock, along the bottom of the window over the real screen: the caption (the idea it introduces, as a chip,
 * then one or two sentences), the transport (back, play / pause, forward), the rail, and the way out. It says the screens
 * under it are the demo estate replayed, so nothing on them reads as the person's own projects.
 */
export function Dock({ g }: { g: GuideState }) {
  // No focus is taken: the guide's keys are heard from anywhere, and the caption is a live region.
  const step = STEPS[g.i];
  if (!step) return null;
  return (
    <section className={styles.dock} aria-label="Guide" data-guide-dock>
      <div className={styles.cap}>
        <span className={`${styles.cpt} ${step.concept ? '' : styles.none}`}>{step.concept ?? 'Recap'}</span>
        <p aria-live="polite">{step.caption}</p>
        <span className={styles.cnt}>
          {g.i + 1} / {N}
        </span>
        <button type="button" className={styles.leave} aria-label="Leave the guide" title="Leave the guide (Esc)" onClick={() => guideStore.close()}>
          ×
        </button>
      </div>
      <div className={styles.ctl}>
        <div className={styles.tb}>
          <button type="button" aria-label="Previous step" disabled={g.i === 0} onClick={() => send({ type: 'prev' })}>
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <path d="M13 3v12l-8-6zM4 3h2v12H4z" />
            </svg>
          </button>
          <button type="button" className={styles.play} aria-label={g.playing ? 'Pause' : 'Play'} onClick={() => send({ type: 'toggle' })}>
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <path d={g.playing ? 'M4 3h3.5v12H4zM10.5 3H14v12h-3.5z' : 'M5 3v12l10-6z'} />
            </svg>
            {g.playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" aria-label="Next step" disabled={g.i === N - 1} onClick={() => send({ type: 'next' })}>
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <path d="M5 3v12l8-6zM12 3h2v12h-2z" />
            </svg>
          </button>
        </div>
        <Rail i={g.i} running={autoAdvances(g)} entry={entryOf(g)} onGo={(k) => send({ type: 'go', to: k })} />
        <div className={styles.side}>
          <span className={styles.badge}>
            <b>Replay</b> on illustrative demo data
          </span>
          <span className={styles.hint}>
            <kbd>←</kbd> <kbd>→</kbd> step · <kbd>Space</kbd> pause · <kbd>Esc</kbd> leave
          </span>
        </div>
      </div>
    </section>
  );
}
