import styles from './PrerollCue.module.css';

/**
 * Present mode hides the toolbar, so the take's pre-roll ("Pre-roll 2…") would be a frozen frame with no cue. This
 * small pill says it on the stage instead: only while `left` (whole seconds, from the replay view) is above zero, so
 * it is gone the moment playback starts and never part of the recorded story. A plain element, not a live region.
 */
export function PrerollCue({ left }: { left: number }) {
  if (left <= 0) return null;
  return (
    <div className={styles.cue} data-cue="preroll">
      <i className={styles.dot} aria-hidden="true" />
      Rolling in {left}…
    </div>
  );
}
