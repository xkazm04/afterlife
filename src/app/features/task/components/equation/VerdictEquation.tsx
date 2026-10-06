import { HelpButton } from '@/components/overlays/HelpButton';
import type { TaskView } from '../../model/types';
import type { Selection } from '../../model/court/selection';
import { equationTerms, verdictWord } from '../../model/verdict/equation';
import { checkShown, type ReplayState } from '../../model/verdict/replay';
import { tally } from '../../model/verdict/verdict';
import { Term } from './Term';
import styles from './VerdictEquation.module.css';

/**
 * The verdict as an equation: PASS or FAIL, then verdict = the AND of the engine's checks. One failed term fails the proof
 * (the box is hatched red). While a replay runs the word waits and terms land one by one.
 */
export function VerdictEquation({ task, sel, rv, onSelect }: { task: TaskView; sel: Selection; rv: ReplayState; onSelect: (id: string) => void }) {
  const { word, waiting, fail } = verdictWord(task, rv);
  const terms = equationTerms(task, sel, rv);
  const n = tally(task, (i) => checkShown(rv, i));
  return (
    <section className={`${styles.eq} ${fail ? styles.fail : ''}`} role="group" aria-label="Verdict">
      <div className={`${styles.v} ${waiting ? styles.wait : ''}`} aria-live="polite">
        {word}
      </div>
      <div className={styles.f}>
        <span className={styles.lhs}>verdict =</span>
        {terms.map((t, i) => (
          <span key={t.id} className={styles.slot}>
            {i > 0 ? <span className={styles.op}>∧</span> : null}
            <Term term={t} onSelect={onSelect} />
          </span>
        ))}
      </div>
      <div className={styles.tally}>
        <span className={styles.ok} title="hold">
          ✓{n.ok}
        </span>
        {n.bad ? (
          <span className={styles.bad} title="fail">
            ✗{n.bad}
          </span>
        ) : null}
        {n.unk ? (
          <span className={styles.unk} title="a person decides">
            ?{n.unk}
          </span>
        ) : null}
        <HelpButton title="verdict = ∧ of the engine's checks">
          <div>One ✗ term fails the proof. A struck term is decided by a person and is not counted as a pass. Claims are never terms.</div>
          <hr />
          <div className={styles.eng}>
            {task.proof.engine} · {task.proof.digest}
          </div>
        </HelpButton>
      </div>
    </section>
  );
}
