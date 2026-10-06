'use client';

import { useToast } from '@/components/overlays/toast/useToast';
import styles from './ObjectLink.module.css';

/**
 * A read-only link to a GitLab object. There is no GitLab behind the demo, so a click says what would open.
 * It stops the click, so a link inside a selectable card does not also select the card.
 */
// kit-candidate: the prototype's .ln read-only object link. Promote next to controls/.
export function ObjectLink({ target, label }: { target: string; label?: string }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      className={styles.ln}
      onClick={(e) => {
        e.stopPropagation();
        toast(`Open ${target} in GitLab · read-only link, as you · this screen writes nothing`);
      }}
    >
      {label ?? target} ↗
    </button>
  );
}
