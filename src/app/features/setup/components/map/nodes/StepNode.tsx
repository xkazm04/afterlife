import { Unread } from '@/components/shell/host';
import { Spinner } from '../../shared/Spinner';
import type { Lit } from '../../../model/map/hot';
import type { StepState } from '../../../model/types';
import { isHumanGate, isSaid } from '../../../model/flow/state';
import { stepTip } from '../../../model/flow/wording';
import { MapNode } from './MapNode';
import type { NodeEvents } from './nodeTypes';
import nodes from './nodes.module.css';
import styles from './steps.module.css';

const CLS = { todo: '', human: styles.human, done: styles.sdone, probing: styles.probing, failed: styles.sfailed, unknown: styles.sunknown } as const;

/** `unread` (live, before the steps are read): a dash for its state, never "?", and it is not marked yours yet. */
export function StepNode({ step, lit, events, unread = false }: { step: StepState; lit: Lit; events: NodeEvents; unread?: boolean }) {
  const mark = unread ? <Unread label={`step ${step.n} not read yet`} /> : step.st === 'done' ? '✓' : step.st === 'probing' ? <Spinner /> : step.st === 'unknown' ? '?' : step.n;
  return (
    <MapNode focus={{ k: 'step', id: step.n }} lit={lit} tip={`${unread ? `step ${step.n} · not read yet` : stepTip(step.n, step.st, step.said)} · ${step.title}`} events={events} className={`${styles.sn} ${unread ? '' : CLS[step.st]}`}>
      <span className={styles.m}>{mark}</span>
      <span className={nodes.lb}>{step.title}</span>
      {unread ? null : isHumanGate(step) ? <span className={styles.x}>you</span> : isSaid(step) ? <span className={styles.said}>said</span> : null}
    </MapNode>
  );
}
