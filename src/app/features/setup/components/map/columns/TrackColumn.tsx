'use client';

import { useSetup } from '../../../hooks/SetupContext';
import { armList, armedCount } from '../../../model/flow/state';
import { litOf } from '../../../model/map/hot';
import { focusEq } from '../../../model/types';
import { TrackNode } from '../nodes/TrackNode';
import type { NodeEvents } from '../nodes/nodeTypes';
import { ColumnHead } from './ColumnHead';
import styles from './columns.module.css';

/** The eight tracks in arm order. */
export function TrackColumn({ events }: { events: NodeEvents }) {
  const { state, view, tracks, illustrative } = useSetup();
  const arms = armList(state);
  return (
    <div className={`${styles.col} ${styles.tracks}`}>
      <ColumnHead
        name="Tracks"
        sub="arm order"
        aux={`${armedCount(state)}/${arms.length} armed`}
        demo={illustrative.tracks ? "The tracks' names and arm order are the demo catalogue's; each state is a read of the target's main" : undefined}
      />
      {arms.map((a) => (
        <TrackNode
          key={a.id}
          arm={a}
          name={tracks[a.id]?.name ?? a.id}
          state={state}
          selected={focusEq(view.sel, { k: 'track', id: a.id })}
          lit={litOf(view.hot, { k: 'track', id: a.id })}
          events={events}
        />
      ))}
    </div>
  );
}
