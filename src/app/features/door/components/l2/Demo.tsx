import styles from './l2panel.module.css';

/** The panel's dashed mark (as on a seeded item) on demo text that sits beside live rows; nothing when `on` is false. */
export function Demo({ on }: { on: boolean }) {
  return on ? (
    <>
      {' '}
      <span className={styles.seeded} title="Demo text: live mode does not read this from GitLab yet">
        demo
      </span>
    </>
  ) : null;
}
