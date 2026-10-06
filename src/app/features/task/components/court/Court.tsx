'use client';

import { useRef } from 'react';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { Chip } from '@/components/status/chip/Chip';
import { useTieGeometry } from '../../hooks/useTieGeometry';
import type { TaskView } from '../../model/types';
import { emphasis, type Selection } from '../../model/court/selection';
import { checkShown, replayDone, type ReplayState } from '../../model/verdict/replay';
import { checkKind } from '../../model/verdict/verdict';
import { CheckCard } from './CheckCard';
import { ClaimCard } from './ClaimCard';
import { Ties } from './Ties';
import styles from './Court.module.css';

/**
 * The cross-examination: the agent's claims on the left, the engine's checks on the right, a tie line between each claim
 * and the check that tests it. Selecting either side lights its ties and dims the rest.
 */
export function Court({ task, sel, rv, onPick }: { task: TaskView; sel: Selection; rv: ReplayState; onPick: (side: 'check' | 'claim', id: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const geo = useTieGeometry(ref, task);
  const done = replayDone(rv, task.proof.checks.length);
  return (
    <section ref={ref} className={styles.court} aria-label="Claims tested by checks">
      <Ties task={task} sel={sel} rv={rv} geo={geo} />
      <div className={styles.col} aria-label="Claims">
        <div className={styles.colh}>
          <b>Claims</b>
          <small>{task.agent}</small>
          <span className={styles.end}>
            <HonestyChip kind="unknown">untrusted</HonestyChip>
          </span>
        </div>
        {task.claims.map((c) => (
          <ClaimCard key={c.id} task={task} claim={c} emphasis={emphasis(task, sel, 'claim', c.id)} done={done} onSelect={() => onPick('claim', c.id)} />
        ))}
      </div>
      <div className={styles.lane} data-lane>
        <span>tested by</span>
      </div>
      <div className={styles.col} aria-label="Checks">
        <div className={styles.colh}>
          <b>Checks</b>
          <small>{task.proof.engine} · no model</small>
          <span className={styles.end}>
            <Chip title="only checks decide">decide</Chip>
          </span>
        </div>
        {task.proof.checks.map((c, i) => (
          <CheckCard
            key={c.id}
            task={task}
            check={c}
            kind={checkKind(c.ok)}
            emphasis={emphasis(task, sel, 'check', c.id)}
            landed={checkShown(rv, i)}
            onSelect={() => onPick('check', c.id)}
          />
        ))}
      </div>
    </section>
  );
}
