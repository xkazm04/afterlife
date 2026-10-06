import type { CapStatus } from '../../model/types';
import styles from './CapGlyph.module.css';

const GLYPH: Record<CapStatus, string> = { available: '✓', unavailable: '✕', unknown: '?' };
export const capGlyph = (st: CapStatus): string => GLYPH[st];

/** A capability's state as a ringed glyph. Colour is never alone: ✓ available, ✕ unavailable, dashed ? unknown. */
export function CapGlyph({ st, size = 16 }: { st: CapStatus; size?: number }) {
  const px = `calc(${size}px * var(--ui-scale))`;
  return (
    <span className={`${styles.g} ${styles[st] ?? ''}`} style={{ width: px, height: px }} aria-hidden="true">
      {GLYPH[st]}
    </span>
  );
}
