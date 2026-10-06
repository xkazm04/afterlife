import type { KeyboardEvent } from 'react';
import type { TaskClaim, TaskView } from '../../model/types';
import type { Emphasis } from '../../model/court/selection';
import { claimStatus } from '../../model/verdict/verdict';
import { StatusTag } from '../StatusTag';
import styles from './cards.module.css';

/** Enter or Space on the card itself (not on a link inside it) selects it. */
export function activateOnKey(e: KeyboardEvent<HTMLElement>, run: () => void) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
    e.preventDefault();
    run();
  }
}

/**
 * A claim as the agent wrote it. Untrusted: the text is rendered as text, never as markup, with ligatures off, and it is
 * never a term of the verdict. Its status shows once the verdict has landed.
 */
export function ClaimCard({
  task,
  claim,
  emphasis,
  done,
  onSelect,
}: {
  task: TaskView;
  claim: TaskClaim;
  emphasis: Emphasis;
  done: boolean;
  onSelect: () => void;
}) {
  const st = claimStatus(task, claim);
  return (
    <div
      role="button"
      tabIndex={0}
      data-claim-card={claim.id}
      aria-pressed={emphasis === 'sel'}
      className={[styles.cd, styles.claim, styles[emphasis]].filter(Boolean).join(' ')}
      onClick={onSelect}
      onKeyDown={(e) => activateOnKey(e, onSelect)}
    >
      <div className={styles.top}>
        <span className={styles.id}>{claim.id}</span>
        {done ? <StatusTag kind={st.kind}>{st.label}</StatusTag> : <StatusTag kind="unk">awaiting</StatusTag>}
      </div>
      <div className={styles.quoted}>{claim.text}</div>
    </div>
  );
}
