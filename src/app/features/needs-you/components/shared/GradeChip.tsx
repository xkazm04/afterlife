import styles from './GradeChip.module.css';

export type GradeChipState = 'cur' | 'done' | 'idle' | 'never';

/** One rung of the packet's grade ladder. "never" is struck out: Belay does not say "attested". */
export function GradeChip({ state = 'idle', title, children }: { state?: GradeChipState; title?: string; children: string }) {
  const cls = [styles.gr, state === 'idle' ? '' : styles[state]].filter(Boolean).join(' ');
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}
