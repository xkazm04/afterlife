'use client';

// The host's reveal parts: <Unread/> (an em dash where a value is not read yet) and <Reveal order slice> (a region that
// paints at once and settles in, in its screen's designed order, when its slice lands). Tokens --reveal-step and
// --reveal-dur set the beat; prefers-reduced-motion drops the animation.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useScope } from '../hooks/scope';
import { useSlice } from '../hooks/useSlice';
import styles from './reveal.module.css';

/** An unread value: "—", never 0 or blank. `label` names what is missing for a screen reader ("cost not read yet"). */
export function Unread({ label = 'not read yet' }: { label?: string }) {
  return (
    <span className={styles.unread} role="img" aria-label={label} title={label}>
      —
    </span>
  );
}

/**
 * A region of a screen. Without `slice` it enters on mount at `order`; with one it waits (drawn, dashes inside) until
 * that slice is read (ok or error), then enters at `order`. It enters once: a kept screen shown again does not replay,
 * and in the host a region whose slice is already read when it mounts (kept across a param change) is simply there.
 * The wrapper is a plain block: give it the region's layout through className / style.
 */
export function Reveal({ order = 0, slice, className, style, children }: { order?: number; slice?: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const s = useSlice<unknown>(slice ?? '');
  const landed = slice === undefined || s.state !== 'unread';
  const scope = useScope();
  const inHost = scope !== null && 'key' in scope;
  const [settled, setSettled] = useState(() => inHost && slice !== undefined && landed);
  const phase = !landed ? 'wait' : settled ? 'done' : 'in';
  return (
    <div
      className={className ? `${styles.reveal} ${className}` : styles.reveal}
      data-reveal={phase}
      style={{ ...style, '--reveal-order': order } as CSSProperties}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setSettled(true);
      }}
    >
      {children}
    </div>
  );
}
