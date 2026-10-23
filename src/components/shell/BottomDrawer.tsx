import type { ReactNode } from 'react';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Icon } from '@/components/icons/Icon';
import styles from './BottomDrawer.module.css';

/**
 * A titled panel docked under the pane (a flex column child below it): a header with the title, a count, a hint and a
 * hide button, then a scrolling body. It takes about a third of the pane; `compact` shrinks it to its content (an empty
 * list). The body is a live region. What goes in the body, and when the drawer shows, is the screen's.
 */
export function BottomDrawer({
  title,
  count,
  hint,
  closeLabel,
  onClose,
  compact,
  children,
}: {
  title: string;
  /** Shown in a pill that lights up when it is above zero. */
  count: number;
  hint?: ReactNode;
  /** The accessible name and tooltip of the hide button ("Hide outbox"). */
  closeLabel: string;
  onClose: () => void;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={compact ? `${styles.drawer} ${styles.compact}` : styles.drawer} aria-label={title}>
      <div className={styles.head}>
        <b>{title}</b>
        <span className={count ? `${styles.n} ${styles.on}` : styles.n}>{count}</span>
        {hint ? <span>{hint}</span> : null}
        <span className={styles.close}>
          <ToolbarButton title={closeLabel} aria-label={closeLabel} onClick={onClose}>
            <Icon name="close" />
          </ToolbarButton>
        </span>
      </div>
      <div className={styles.body} aria-live="polite">
        {children}
      </div>
    </section>
  );
}
