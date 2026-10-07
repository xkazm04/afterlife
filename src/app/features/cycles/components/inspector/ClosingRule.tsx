import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { Cycle, CycleChange } from '../../model/types';
import styles from './inspector.module.css';

/**
 * The checks a closing rescan makes before it credits a rung, the same four for every cycle, and the verdict that
 * failing each one leaves: a change that was not exercised gets no lift, a detector-only diff is rejected.
 */
const RULES: readonly { name: string; means: string; fails?: CycleChange['verdict'] }[] = [
  { name: 'Same engine', means: 'the rescan runs the engine the cycle opened with; credit never crosses versions' },
  { name: 'Exercised', means: 'the job ran on the default branch and left evidence: configured is not enough', fails: 'nolift' },
  { name: 'Not detector-only', means: 'a diff that only adds an empty config earns nothing', fails: 'rejected' },
  { name: 'Held or on record', means: 'every other stage holds its rung, or the drift is written into the cycle' },
];

const label = (c: CycleChange): string => c.mr ?? c.gap ?? c.kind;

/**
 * How a cycle closes. On a closed cycle each check is ✓ only if no change failed it; a failed check names how many
 * changes it stopped, and they are listed under it with the engine's words. An open cycle shows the checks ahead.
 */
export function ClosingRule({ cycle }: { cycle: Cycle }) {
  const closed = cycle.state === 'closed';
  const drift = cycle.changes.filter((c) => c.verdict === 'regressed');
  const missed = cycle.changes.filter((c) => c.verdict === 'rejected' || c.verdict === 'nolift');
  const failing = RULES.reduce((n, r) => n + (r.fails && cycle.changes.some((c) => c.verdict === r.fails) ? 1 : 0), 0);
  return (
    <InspectorSection title="Closing rule" aux={closed ? (failing ? `${missed.length} change${missed.length === 1 ? '' : 's'} stopped` : 'all held') : 'ahead'}>
      <ul className={styles.rules}>
        {RULES.map((r) => {
          const stopped = r.fails ? cycle.changes.filter((c) => c.verdict === r.fails).length : 0;
          const mark = !closed ? '○' : stopped ? '✗' : '✓';
          return (
            <li key={r.name} data-met={(closed && !stopped) || undefined} data-failed={(closed && stopped > 0) || undefined}>
              <span aria-hidden="true">{mark}</span>
              <span>
                <b>{r.name}</b> {r.means}
                {closed && stopped ? <em className={styles.stopped}> · stopped {stopped}</em> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {missed.length || drift.length ? (
        <ul className={styles.notes}>
          {missed.map((c, i) => (
            <li key={`m-${i}-${label(c)}`}>
              <b>{label(c)}</b> {c.stage}: {c.why}
            </li>
          ))}
          {drift.map((c, i) => (
            <li key={`d-${i}-${c.stage}`} data-drift>
              <b>drift</b> {c.stage} R{c.from} → R{c.to}: {c.why} (on record)
            </li>
          ))}
        </ul>
      ) : null}
    </InspectorSection>
  );
}
