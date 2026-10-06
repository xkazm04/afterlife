'use client';

import type { ReactNode } from 'react';
import { usePopover } from './popover/usePopover';
import styles from './HelpButton.module.css';

/**
 * The "?" in the status bar. Opens the legend (any content) in a sticky popover above it; click again or Escape
 * closes it. Legends and definitions live here, not inline (the two-layer rule).
 */
export function HelpButton({ title = 'Legend', children }: { title?: string; children: ReactNode }) {
  const pop = usePopover();
  return (
    <>
      <button
        type="button"
        className={styles.help}
        title={title}
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={pop.isSticky}
        onClick={(e) =>
          pop.toggle(
            e.currentTarget,
            <>
              <h4>{title}</h4>
              {children}
            </>,
            'above',
          )
        }
      >
        ?
      </button>
      {pop.popover}
    </>
  );
}
