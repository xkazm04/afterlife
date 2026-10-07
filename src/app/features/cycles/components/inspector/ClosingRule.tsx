import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { Cycle } from '../../model/types';
import styles from './inspector.module.css';

/** The checks a closing rescan makes before it credits a rung. The same four for every cycle. */
const RULES: readonly [string, string][] = [
  ['Same engine', 'the rescan runs the engine the cycle opened with; credit never crosses versions'],
  ['Exercised', 'the job ran on the default branch and left evidence: configured is not enough'],
  ['Not detector-only', 'a diff that only adds an empty config earns nothing'],
  ['Held or on record', 'every other stage holds its rung, or the drift is written into the cycle'],
];

/**
 * How a cycle closes. A closed cycle shows the rule met (its misses and drift are named); an open one shows it ahead.
 */
export function ClosingRule({ cycle }: { cycle: Cycle }) {
  const missed = cycle.changes.filter((c) => c.verdict === 'rejected' || c.verdict === 'nolift');
  const drift = cycle.changes.filter((c) => c.verdict === 'regressed');
  const closed = cycle.state === 'closed';
  return (
    <InspectorSection title="Closing rule" aux={closed ? 'met' : 'ahead'}>
      <ul className={styles.rules}>
        {RULES.map(([name, means]) => (
          <li key={name} data-met={closed || undefined}>
            <span aria-hidden="true">{closed ? '✓' : '○'}</span>
            <span>
              <b>{name}</b> {means}
            </span>
          </li>
        ))}
      </ul>
      {missed.length || drift.length ? (
        <ul className={styles.notes}>
          {missed.map((c) => (
            <li key={`m-${c.mr ?? c.stage}`}>
              <b>{c.mr}</b> {c.stage}: {c.why}
            </li>
          ))}
          {drift.map((c) => (
            <li key={`d-${c.stage}`} data-drift>
              <b>drift</b> {c.stage} R{c.from} → R{c.to}: {c.why}
            </li>
          ))}
        </ul>
      ) : null}
    </InspectorSection>
  );
}
