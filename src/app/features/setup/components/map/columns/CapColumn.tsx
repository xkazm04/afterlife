'use client';

import { useSetup } from '../../../hooks/SetupContext';
import { doctorCounts } from '../../../model/flow/state';
import { litOf } from '../../../model/map/hot';
import { focusEq } from '../../../model/types';
import { CapNode } from '../nodes/CapNode';
import type { NodeEvents } from '../nodes/nodeTypes';
import { ColumnHead } from './ColumnHead';
import styles from './columns.module.css';

/** The GitLab capabilities belay doctor reports. */
export function CapColumn({ events }: { events: NodeEvents }) {
  const { state, view } = useSetup();
  return (
    <div className={`${styles.col} ${styles.caps}`}>
      <ColumnHead name="GitLab" sub="belay doctor" aux={`${doctorCounts(state).unknown} unknown`} />
      {state.doctor.map((r) => (
        <CapNode key={r.name} row={r} selected={focusEq(view.sel, { k: 'cap', id: r.name })} lit={litOf(view.hot, { k: 'cap', id: r.name })} events={events} />
      ))}
    </div>
  );
}
