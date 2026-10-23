import { RUNGS } from '@/schemas/stages';
import styles from './RungSteps.module.css';

const STEPS = Array.from({ length: RUNGS.length - 1 }, (_, k) => k + 1);

/**
 * The rung bar: one step per rung above "absent", filled up to `rung`; `evidence` paints the filled steps in the accent.
 * The steps are empty marks, so the bar names its rung for a screen reader (StageRows shows the rung only as a tooltip).
 */
export function RungSteps({ rung, evidence = false, className }: { rung: number; evidence?: boolean; className?: string }) {
  const cls = [styles.steps, evidence ? styles.evd : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} role="img" aria-label={`R${rung} of ${STEPS.length} (${RUNGS[rung] ?? 'unknown'})`}>
      {STEPS.map((k) => (
        <i key={k} className={rung >= k ? styles.on : undefined} />
      ))}
    </span>
  );
}
