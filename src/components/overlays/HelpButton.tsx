'use client';

import { useId, type ReactNode } from 'react';
import { usePopover } from './popover/usePopover';
import styles from './HelpButton.module.css';

/**
 * The "?" in the status bar. Hover or focus shows the legend (any content) above it after the popover's delay, like a
 * tooltip; a click pins it open (sticky), and click again or Escape closes it. Its foot asks for the X-ray of the screen
 * (the `afterlife:xray` window event) or the guide (`afterlife:guide`), each heard by the (app) layout's overlay. Legends and definitions live here, not inline (the two-layer rule).
 */
export function HelpButton({ title = 'Legend', children }: { title?: string; children: ReactNode }) {
  const pop = usePopover();
  const legendId = useId();
  const body = (
    <div id={legendId}>
      <h4>{title}</h4>
      {children}
      <button type="button" className={styles.xray} onClick={() => window.dispatchEvent(new Event('afterlife:xray'))}>
        Label every part <kbd>X</kbd>
      </button>
      <button type="button" className={styles.xray} onClick={() => window.dispatchEvent(new Event('afterlife:guide'))}>
        Watch the guide <kbd>G</kbd>
      </button>
    </div>
  );
  const peek = (el: Element) => pop.show(el, body, { delay: true, placement: 'above' });
  return (
    <>
      <button
        type="button"
        className={styles.help}
        data-xray="help"
        title={title}
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={pop.isSticky}
        aria-describedby={pop.isOpen && !pop.isSticky ? legendId : undefined}
        onMouseEnter={(e) => peek(e.currentTarget)}
        onMouseLeave={pop.hide}
        onFocus={(e) => peek(e.currentTarget)}
        onBlur={pop.hide}
        onKeyDown={(e) => e.key === 'Escape' && pop.close()}
        onClick={(e) => pop.toggle(e.currentTarget, body, 'above')}
      >
        ?
      </button>
      {pop.popover}
    </>
  );
}
