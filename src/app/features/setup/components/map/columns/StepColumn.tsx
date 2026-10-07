'use client';

import { Fragment } from 'react';
import { useSetup } from '../../../hooks/SetupContext';
import { doneCount, stepList } from '../../../model/flow/state';
import { litOf } from '../../../model/map/hot';
import { focusEq } from '../../../model/types';
import { StepNode } from '../nodes/StepNode';
import type { NodeEvents } from '../nodes/nodeTypes';
import { ColumnHead } from './ColumnHead';
import styles from './columns.module.css';

/** Steps 0-14, grouped by phase. */
export function StepColumn({ events }: { events: NodeEvents }) {
  const { state, view, illustrative } = useSetup();
  const steps = stepList(state);
  return (
    <div className={styles.col}>
      <ColumnHead
        name="Path"
        sub="steps 0–14"
        aux={`${doneCount(state)}/${steps.length}`}
        demo={illustrative.steps ? "The steps' titles and phases are the demo catalogue's; each state is what a read saw, or unknown" : undefined}
      />
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          {s.phase !== steps[i - 1]?.phase ? <div className={styles.ph}>{s.phase}</div> : null}
          <StepNode step={s} selected={focusEq(view.sel, { k: 'step', id: s.n })} lit={litOf(view.hot, { k: 'step', id: s.n })} events={events} />
        </Fragment>
      ))}
    </div>
  );
}
