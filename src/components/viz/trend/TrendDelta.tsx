import styles from './trend.module.css';

/**
 * A week's change as an arrow and a signed number ("↑ +2", "↓ -1", "→ 0"). null is a dash, never 0: there is no row a
 * week back to compare with. Neutral ink both ways: a rise is not an alarm and a fall is not praise. `label` names the
 * number for the accessible name ("waiting"); `title` replaces the default hover text (the pending line, say).
 */
export function TrendDelta({ value, label, title }: { value: number | null; label: string; title?: string }) {
  if (value === null) {
    const name = `${label}: no week to compare yet`;
    return (
      <span className={`${styles.delta} ${styles.none}`} role="img" aria-label={name} title={title ?? name}>
        -
      </span>
    );
  }
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  const n = value > 0 ? `+${value}` : String(value);
  const name = `${label} ${n} since last week`;
  return (
    <span className={value === 0 ? `${styles.delta} ${styles.flat}` : styles.delta} role="img" aria-label={name} title={title ?? name}>
      {arrow} {n}
    </span>
  );
}
