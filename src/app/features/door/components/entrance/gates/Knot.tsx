import styles from './knot.module.css';

/** The Belay knot's three parts (public/brand/belay-b-knot.svg, 64 x 64): the hexagon open at the top right, the loop, the pin. */
const HEX = 'M50.2 14.5 56.2 18V46L32 60 7.8 46V18L32 4l6 3.5';
const LOOP = 'M32 32C32 19 15 19 15 32S32 45 32 32 49 19 49 32 32 45 32 32Z';

function Mark({ glow = false }: { glow?: boolean }) {
  return (
    <g className={glow ? styles.bloom : undefined} filter={glow ? 'url(#gt-glow)' : undefined}>
      <path className={styles.hex} d={HEX} pathLength={1} />
      <g className={styles.turn}>
        <path className={styles.loop} d={LOOP} />
      </g>
      <circle className={styles.pin} cx="44.1" cy="11" r="3.4" />
    </g>
  );
}

/**
 * The lock: the knot redrawn in tokens so its parts can move. The hexagon traces itself in; the pink pin is drawn into
 * the gap like a key and seats with a flash; the knot turns a half turn while light runs both lobes of the loop; then
 * the halo warms to the treasure's amber. A blurred copy underneath is the bloom (a small static filter).
 */
export function Knot() {
  return (
    <svg className={styles.knot} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <filter id="gt-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <radialGradient id="gt-halo-cy">
          <stop offset="0" className={styles.cyIn} />
          <stop offset="1" className={styles.out} />
        </radialGradient>
        <radialGradient id="gt-halo-am">
          <stop offset="0" className={styles.amIn} />
          <stop offset="1" className={styles.out} />
        </radialGradient>
      </defs>
      <circle className={styles.haloCy} cx="32" cy="32" r="34" fill="url(#gt-halo-cy)" />
      <circle className={styles.haloAm} cx="32" cy="32" r="40" fill="url(#gt-halo-am)" />
      <Mark glow />
      <Mark />
      <g className={styles.turn}>
        <path className={styles.spark} d={LOOP} pathLength={1} />
      </g>
      <circle className={styles.seat} cx="44.1" cy="11" r="3.4" />
    </svg>
  );
}
