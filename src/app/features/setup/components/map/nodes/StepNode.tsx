import { Spinner } from '../../shared/Spinner';
import type { Lit } from '../../../model/map/hot';
import type { StepState } from '../../../model/types';
import { stepTip } from '../../../model/flow/wording';
import { MapNode } from './MapNode';
import type { NodeEvents } from './nodeTypes';
import styles from './nodes.module.css';

const CLS = { todo: '', human: styles.human, done: styles.sdone, probing: styles.probing } as const;

export function StepNode({ step, selected, lit, events }: { step: StepState; selected: boolean; lit: Lit; events: NodeEvents }) {
  const mark = step.st === 'done' ? '✓' : step.st === 'probing' ? <Spinner /> : step.n;
  return (
    <MapNode focus={{ k: 'step', id: step.n }} selected={selected} lit={lit} tip={`${stepTip(step.n, step.st)} · ${step.title}`} events={events} className={`${styles.sn} ${CLS[step.st]}`}>
      <span className={styles.m}>{mark}</span>
      <span className={styles.lb}>{step.title}</span>
      {step.st === 'human' ? <span className={styles.x}>you</span> : null}
    </MapNode>
  );
}
