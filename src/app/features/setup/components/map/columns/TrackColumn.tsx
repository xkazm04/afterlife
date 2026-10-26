'use client';

import { useSetup } from '../../../hooks/SetupContext';
import { Unread } from '@/components/shell/host';
import { armList, armedCount, isUnread } from '../../../model/flow/state';
import { litOf } from '../../../model/map/hot';
import { TrackNode } from '../nodes/TrackNode';
import type { NodeEvents } from '../nodes/nodeTypes';
import { ColumnHead } from './ColumnHead';
import styles from './columns.module.css';

/** The eight tracks in arm order. */
export function TrackColumn({ events }: { events: NodeEvents }) {
  const { state, view, tracks, illustrative } = useSetup();
  const arms = armList(state);
  const unread = isUnread(state, 'tracks');
  return (
    <div className={`${styles.col} ${styles.tracks}`} role="group" aria-label="Tracks · arm order">
      <ColumnHead
        name="Tracks"
        sub="arm order"
        aux={unread ? <><Unread label="tracks not read yet" />/{arms.length} armed</> : `${armedCount(state)}/${arms.length} armed`}
        demo={illustrative.tracks ? "The tracks' names and arm order are the demo catalogue's; each state is a read of the target's main" : undefined}
      />
      {arms.map((a) => (
        <TrackNode
          key={a.id}
          arm={a}
          name={tracks[a.id]?.name ?? a.id}
          state={state}
          unread={unread}
          lit={litOf(view.hot, { k: 'track', id: a.id })}
          events={events}
        />
      ))}
    </div>
  );
}
