import type { CSSProperties } from 'react';
import { GLYPHS, type Glyph, type IconName } from './glyphs';

/**
 * Line icon drawn in currentColor. Its size is the prototype's pixel size times --ui-scale, so it grows with the
 * text-size setting. Decorative by default (aria-hidden); pass `label` to expose it.
 */
export function Icon({ name, label, className, style }: { name: IconName; label?: string; className?: string; style?: CSSProperties }) {
  const g: Glyph = GLYPHS[name];
  return (
    <svg
      className={className}
      style={{ width: `calc(${g.w}px * var(--ui-scale))`, height: `calc(${g.h}px * var(--ui-scale))`, flex: 'none', ...style }}
      viewBox={`0 0 ${g.w} ${g.h}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={g.sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {g.node}
    </svg>
  );
}
