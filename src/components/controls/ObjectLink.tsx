'use client';

import { useToast } from '@/components/overlays/toast/useToast';
import styles from './ObjectLink.module.css';

/**
 * A read-only link to an object in GitLab. There is no GitLab behind the demo, so a click toasts what would open (or
 * your `message`). It stops the click, so a link inside a selectable card does not also select the card.
 */
export function ObjectLink({ target, label, message }: { target: string; label?: string; message?: string }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      className={styles.ln}
      onClick={(e) => {
        e.stopPropagation();
        toast(message ?? `Open ${target} in GitLab · read-only link, as you · this screen writes nothing`);
      }}
    >
      {label ?? target} ↗
    </button>
  );
}
