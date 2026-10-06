import styles from './DoesNot.module.css';

/** "The click": what the button does (green ticks) and what it will not do (red crosses). */
export function DoesNot({ does, doesNot }: { does: readonly string[]; doesNot: readonly string[] }) {
  return (
    <ul className={styles.dn}>
      {does.map((t) => (
        <li key={t} className={styles.yes}>
          <b>✓</b>
          <span>{t}</span>
        </li>
      ))}
      {doesNot.map((t) => (
        <li key={t} className={styles.no}>
          <b>✕</b>
          <span>will not {t}</span>
        </li>
      ))}
    </ul>
  );
}
