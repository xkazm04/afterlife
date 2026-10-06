'use client';

import { usePopover } from '@/components/overlays/popover/usePopover';
import { MaturityLegend } from '../legend/MaturityLegend';
import styles from './crag.module.css';

/** The "?" in the crag's corner: a sticky legend popover (Escape or a click outside closes it). */
export function LegendButton() {
  const pop = usePopover();
  return (
    <>
      <button
        type="button"
        className={styles.help}
        title="Legend"
        aria-label="Legend"
        aria-haspopup="dialog"
        aria-expanded={pop.isSticky}
        onClick={(e) =>
          pop.toggle(
            e.currentTarget,
            <>
              <h4>Legend</h4>
              <MaturityLegend />
            </>,
            'below',
          )
        }
      >
        ?
      </button>
      {pop.popover}
    </>
  );
}
