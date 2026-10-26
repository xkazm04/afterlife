'use client';

import { CAP_NOTE } from '../../../data/capabilities';
import { useSetup } from '../../../hooks/SetupContext';
import { Unread } from '@/components/shell/host';
import { doctorCounts, isUnread } from '../../../model/flow/state';
import { litOf } from '../../../model/map/hot';
import { CapNode } from '../nodes/CapNode';
import type { NodeEvents } from '../nodes/nodeTypes';
import { ColumnHead } from './ColumnHead';
import styles from './columns.module.css';

/** The GitLab capabilities belay doctor reports. */
export function CapColumn({ events }: { events: NodeEvents }) {
  const { state, view } = useSetup();
  const unread = isUnread(state, 'doctor');
  return (
    <div className={`${styles.col} ${styles.caps}`} role="group" aria-label="GitLab · belay doctor">
      <ColumnHead name="GitLab" sub="belay doctor" aux={unread ? <><Unread label="belay doctor not read yet" /> unknown</> : `${doctorCounts(state).unknown} unknown`} />
      {state.doctor.map((r) => (
        <CapNode key={r.name} row={r} note={state.live ? r.reason : CAP_NOTE[r.name]} lit={litOf(view.hot, { k: 'cap', id: r.name })} events={events} unread={unread} />
      ))}
      {state.doctor.length ? null : (
        <div className={styles.empty}>{state.doctorError ? 'No capability read · the probe failed' : 'belay doctor reported no capability'}</div>
      )}
    </div>
  );
}
