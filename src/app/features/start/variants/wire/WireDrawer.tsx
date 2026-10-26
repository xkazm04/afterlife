import type { CSSProperties, KeyboardEvent } from 'react';
import { StepBody } from '../../components/StepBody';
import type { StartView, StepView } from '../../model/view';
import styles from './drawer.module.css';

/**
 * The selected node's drawer, directly under it: a caret pointing up at the node, then StepBody and nothing else (the
 * title is on the node). It slides in per step (keyed); Esc closes it and hands focus back to the node (WireVariant).
 */
export function WireDrawer({ view, step, at, n, open, id, tabId, onEscape }: {
  view: StartView;
  step: StepView;
  at: number;
  n: number;
  open: boolean;
  id: string;
  tabId: string;
  onEscape: () => void;
}) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onEscape();
  };
  return (
    <div className={styles.panel} id={id} role="tabpanel" aria-labelledby={tabId} hidden={!open} onKeyDown={onKey} style={{ '--at': at, '--n': n, '--o': at * 2 + 1 } as CSSProperties}>
      {open ? <span key={`caret-${step.key}`} className={styles.caret} data-state={step.state} aria-hidden="true" /> : null}
      {open ? (
        <div key={step.key} className={styles.drawer} data-state={step.state}>
          <StepBody view={view} step={step} />
        </div>
      ) : null}
    </div>
  );
}
