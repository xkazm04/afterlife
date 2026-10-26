'use client';

import { CAP_NOTE } from '../../../data/capabilities';
import { useSetup } from '../../../hooks/SetupContext';
import { doctorCounts } from '../../../model/flow/state';
import { litOf } from '../../../model/map/hot';
import { CapNode } from '../nodes/CapNode';
import type { NodeEvents } from '../nodes/nodeTypes';
import { ColumnHead } from './ColumnHead';
import styles from './columns.module.css';

/** The GitLab capabilities the doctor reports. */
export function CapColumn({ events }: { events: NodeEvents }) {
  const { state, view } = useSetup();
  return (
    <div className={`${styles.col} ${styles.caps}`} role="group" aria-label="GitLab · afterlife doctor">
      <ColumnHead name="GitLab" sub="afterlife doctor" aux={`${doctorCounts(state).unknown} unknown`} />
      {state.doctor.map((r) => (
        <CapNode key={r.name} row={r} note={state.live ? r.reason : CAP_NOTE[r.name]} lit={litOf(view.hot, { k: 'cap', id: r.name })} events={events} />
      ))}
      {state.doctor.length ? null : (
        <div className={styles.empty}>{state.doctorError ? 'No capability read · the probe failed' : 'afterlife doctor reported no capability'}</div>
      )}
    </div>
  );
}
