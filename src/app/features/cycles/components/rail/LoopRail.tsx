import { rail } from '../../model/plan';
import type { Cycle } from '../../model/types';
import { PHASE_MEANS, PHASE_WORD, phaseDetail } from '../../model/words';
import styles from './rail.module.css';

/** The phases that wait for a person; only these turn amber when current. */
const PERSON = new Set(['pick', 'send', 'merge']);

/**
 * The six phases of one cycle as a rail: Scan › Pick › Send › Merge › Prove › Credit (the tooltips say who does what).
 * Done phases are lit, the current one is raised, and the rail closes into a loop: credit feeds the next scan.
 */
export function LoopRail({ cycle }: { cycle: Cycle }) {
  const steps = rail(cycle);
  return (
    <ol className={styles.rail} aria-label={`${cycle.id} phases`}>
      {steps.map((s, i) => (
        <li key={s.phase} className={styles.step} data-state={s.state} data-you={(s.state === 'current' && PERSON.has(s.phase)) || undefined} title={PHASE_MEANS[s.phase]} aria-current={s.state === 'current' ? 'step' : undefined}>
          <span className={styles.dot}>{s.state === 'done' ? '✓' : i + 1}</span>
          <span className={styles.txt}>
            <b>{PHASE_WORD[s.phase]}</b>
            <span>{phaseDetail(cycle, s.phase)}</span>
          </span>
        </li>
      ))}
      <li className={styles.back} aria-hidden="true" title="Credit feeds the next scan: the loop does not end">
        ↺
      </li>
    </ol>
  );
}
