import styles from './CommandBlock.module.css';

/**
 * The exact command Belay will run, shown before anything runs (writes only on a click). One command per line,
 * each with a dim "$" prompt. Pass the strings as they would be typed.
 */
export function CommandBlock({ commands, label = 'Command' }: { commands: string | readonly string[]; label?: string }) {
  const lines = typeof commands === 'string' ? [commands] : commands;
  return (
    <pre className={styles.cmd} aria-label={label}>
      {lines.map((l, i) => (
        <span key={i} className={styles.line}>
          <span className={styles.prompt}>$ </span>
          {l}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}
