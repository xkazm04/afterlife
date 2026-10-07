import styles from './NeedsYouEmpty.module.css';

/**
 * When the source holds no inbox item to show: live mode with none read from the group yet (`seeded`: how many the demo
 * seeded into the index, which are not shown), or a demo source without the desk's items. Server component. It says what
 * is missing rather than drawing an empty inbox as if nothing waited for anyone.
 */
export function NeedsYouEmpty({ seeded = 0 }: { seeded?: number }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Needs you</h1>
      <p>
        Belay is reading your GitLab group, and it holds no inbox items yet: no promotion, CRA sign-off, gap pick, re-admit or setup
        step has been opened for this project.
      </p>
      <p className={styles.note}>The inbox fills as the poller finds quarantined classes and as setup and scans run. Nothing is waiting that Belay knows of.</p>
      {seeded ? (
        <p className={styles.note}>{`${seeded} demo item(s) seeded into this index are not shown: they are the demo's, not your group's.`}</p>
      ) : null}
    </main>
  );
}
