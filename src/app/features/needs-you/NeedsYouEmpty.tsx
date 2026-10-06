import styles from './NeedsYouEmpty.module.css';

/**
 * Live mode, when the index does not (yet) hold the inbox items this screen is built around. Server component: it says
 * what is missing rather than drawing an empty inbox as if nothing waited for anyone.
 */
export function NeedsYouEmpty() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Needs you</h1>
      <p>
        Belay is reading your GitLab group, and it holds no inbox items yet: no promotion, CRA sign-off, gap pick, re-admit or setup
        step has been opened for this project.
      </p>
      <p className={styles.note}>The inbox fills as the poller finds quarantined classes and as setup and scans run. Nothing is waiting that Belay knows of.</p>
    </main>
  );
}
