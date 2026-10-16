import { RUNGS } from '@/schemas/stages';
import styles from './RungSteps.module.css';

const STEPS = Array.from({ length: RUNGS.length - 1 }, (_, k) => k + 1);

/** The rung bar: one step per rung above "absent", filled up to `rung`; `evidence` paints the filled steps in the accent. */
export function RungSteps({ rung, evidence = false, className }: { rung: number; evidence?: boolean; className?: string }) {
  const cls = [styles.steps, evidence ? styles.evd : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls}>
      {STEPS.map((k) => (
        <i key={k} className={rung >= k ? styles.on : undefined} />
      ))}
    </span>
  );
}
