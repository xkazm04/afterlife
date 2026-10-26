import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { StackView } from '../../model/view';
import { ChecklistLine } from './ChecklistLine';
import styles from './stack.module.css';
import cl from './checklist.module.css';

/** What went wrong before any line was proposed, as the person's next step (the line above says what). */
function Failed({ stack }: { stack: StackView }) {
  const e = stack.error;
  if (!e) return null;
  return (
    <div className={cl.problem}>
      {e.code === 'claude-missing' ? <CommandBlock label="Check claude" commands={['claude --version']} /> : null}
      {e.code !== 'bad-root' ? <Button onClick={stack.rerun}>Re-run</Button> : null}
    </div>
  );
}

/**
 * The stack step's checklist (moved from the onboard wizard's FoundStep, its header and prose left to the step): the
 * proposal grouped by Host, Components, Pipelines & variants and Cloud, each line streaming its probe.
 */
export function StackList({ stack, onCopy }: { stack: StackView; onCopy: (command: string) => void }) {
  return (
    <div className={styles.stack}>
      {stack.phase === 'proposing' ? (
        <div className={cl.skeleton} aria-hidden="true">
          {[86, 64, 92, 58, 74].map((w) => (
            <span key={w} style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : null}
      {stack.phase === 'pick' ? <Failed stack={stack} /> : null}
      {stack.groups.map((g) => (
        <div key={g.name} className={cl.group}>
          <h3 className={cl.gh}>{g.name}</h3>
          <ul className={cl.lines} aria-label={g.name}>
            {g.lines.map((l) => (
              <ChecklistLine key={l.id} line={l} onCopy={onCopy} />
            ))}
          </ul>
        </div>
      ))}
      {stack.engine ? (
        <p className={styles.footer}>
          {stack.engine} · {stack.tally.saved} of {stack.tally.total} confirmed
          {stack.phase === 'review' || stack.phase === 'saved' ? (
            <Button size="mini" onClick={stack.rerun}>
              Re-run
            </Button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
