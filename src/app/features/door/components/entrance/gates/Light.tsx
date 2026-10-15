import type { CSSProperties } from 'react';
import styles from './light.module.css';

/** Motes of the treasure light drifting out of the seam: placed by index, so the server and the client agree. */
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  y: 10 + ((i * 37) % 80),
  dx: (i % 2 ? 1 : -1) * (3 + ((i * 13) % 17)),
  dy: -(6 + ((i * 7) % 16)),
  dur: 1.7 + ((i * 0.37) % 1.3),
  delay: 1.72 + ((i * 0.23) % 0.9),
  size: 2 + (i % 3),
}));

/**
 * The treasure's light: the crack that blazes up and down the seam from the lock, its wide warm glow, the motes, and
 * the flare that floods the gap when the gates part and settles into the city's own glow. Static gradients only; the
 * beats move opacity and transform.
 */
export function Light() {
  return (
    <div className={styles.light} aria-hidden>
      <div className={styles.glow} />
      <div className={styles.core} />
      <div className={styles.motes} data-lite="off">
        {MOTES.map((m, i) => (
          <i
            key={i}
            className={styles.mote}
            style={
              {
                top: `${m.y}%`,
                width: m.size,
                height: m.size,
                '--dx': `${m.dx}vmin`,
                '--dy': `${m.dy}vh`,
                animationDuration: `${m.dur}s`,
                animationDelay: `${m.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className={styles.flare} data-lite="off" />
    </div>
  );
}
