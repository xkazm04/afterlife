'use client';

import { CHAPTERS, STEPS } from '../../model/steps';
import { STEP_MS } from '../../model/playback';
import { guideStore } from '../../model/store';
import styles from './invite.module.css';

const MINUTES = Math.max(1, Math.round((STEPS.length * STEP_MS) / 60_000));

/**
 * The invitation, top centre of the window under the toolbar: the guide never starts by itself, it asks. It names the four
 * chapters (the sidebar's groups) so the path is legible before it starts. Skip hides it for good in this browser; the
 * sidebar's "Watch the guide" and Shift+G still open the guide.
 */
export function Invite() {
  return (
    <section className={styles.invite} aria-label="Guided tour">
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.text}>
        <b>New to Afterlife?</b>
        <span>
          Take the guided tour on the demo estate, about {MINUTES} minutes:{' '}
          {CHAPTERS.map((c, n) => (
            <span key={c.key} className={styles.chapter}>
              {n + 1} {c.label}
            </span>
          ))}
        </span>
      </div>
      <button type="button" className={styles.start} onClick={() => guideStore.open()}>
        Start the tour <kbd>⇧G</kbd>
      </button>
      <button type="button" className={styles.skip} onClick={() => guideStore.skip()}>
        Skip
      </button>
    </section>
  );
}
