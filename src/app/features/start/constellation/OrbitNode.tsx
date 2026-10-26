import type { CSSProperties, KeyboardEvent, Ref } from 'react';
import { StepPulse } from '../components/StepPulse';
import { nameOf, type Star } from './sky';
import styles from './node.module.css';

export interface NodeProps {
  star: Star;
  n: number;
  of: number;
  /** The first step not done: gently highlighted, so the person knows where to press. */
  current: boolean;
  /** The one node in the tab order (roving tabindex): arrow keys move it. */
  tabbable: boolean;
  open: boolean;
  onOpen: () => void;
  onKey: (e: KeyboardEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
}

/** One step on the orbit: a real button at its spot, its pulse in a disc, its title under it; its name says the state. */
export function OrbitNode({ star, n, of, current, tabbable, open, onOpen, onKey, ref }: NodeProps) {
  const { step, pct } = star;
  return (
    <button
      ref={ref}
      type="button"
      className={styles.node}
      style={{ left: `${pct.x}%`, top: `${pct.y}%` } as CSSProperties}
      data-state={step.state}
      data-current={current || undefined}
      data-key={step.key}
      tabIndex={tabbable ? 0 : -1}
      aria-label={nameOf(step, n, of)}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
      onKeyDown={onKey}
    >
      <span className={styles.disc} aria-hidden="true">
        <StepPulse state={step.state} />
      </span>
      <span className={styles.name} aria-hidden="true">
        {step.title}
      </span>
    </button>
  );
}
