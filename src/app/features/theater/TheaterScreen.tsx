'use client';

import { useMemo } from 'react';
import { Window } from '@/components/shell/Window';
import { Stage } from './components/stage/Stage';
import { StatusLine } from './components/chrome/StatusLine';
import { TakesSidebar } from './components/chrome/TakesSidebar';
import { TheaterHelp } from './components/chrome/TheaterHelp';
import { Transport } from './components/chrome/Transport';
import { BeatInspector } from './components/inspector/BeatInspector';
import { REPLAY_LEDGER } from './data/ledger';
import { usePresent } from './hooks/usePresent';
import { useReplaySlice } from './hooks/useReplaySlice';
import { useReplayStore } from './hooks/useReplayStore';
import { useTheaterActions } from './hooks/useTheaterActions';
import { useTheaterKeys } from './hooks/useTheaterKeys';
import { buildSnapshots } from './model/derive/snapshots';
import { rangeOf, readoutFrom, viewOf } from './model/replay/state';
import { shallowEqual } from './model/replay/store';
import type { TheaterDemo } from './model/types';
import styles from './TheaterScreen.module.css';

/** Theater: a recorded ledger slice (seq 480-520) replayed as one change climbing the loop. Route /theater. */
export function TheaterScreen({ demo }: { demo: TheaterDemo }) {
  const snaps = useMemo(() => buildSnapshots(REPLAY_LEDGER, demo.stages), [demo.stages]);
  const store = useReplayStore();
  const present = usePresent();
  const actions = useTheaterActions(store);
  useTheaterKeys(actions, present);

  // Everything except the film position: the screen re-renders on entry, take, marks and transport changes only.
  const v = useReplaySlice(store, viewOf, shallowEqual);
  const snap = snaps[v.i];
  if (!snap) return null;
  const range = rangeOf(v);
  const readout = readoutFrom(v);

  return (
    <>
      <div className={present.on ? styles.hidden : styles.window}>
        <Window
          title="Theater"
          subtitle="acme-lab / ledgerline"
          toolbar={<Transport playing={v.playing} loop={v.loop} readout={readout} actions={actions} onPresent={() => present.set(true)} />}
          sidebar={<TakesSidebar take={v.take} counts={v.counts} range={range} marked={v.mark !== null} actions={actions} />}
          inspector={<BeatInspector snap={snap} demo={demo} onSeek={actions.seek} />}
          status={<StatusLine state={v} />}
          help={<TheaterHelp />}
          helpTitle="Keys and marks"
        >
          {present.on ? null : <Stage snaps={snaps} snap={snap} store={store} demo={demo} present={false} />}
        </Window>
      </div>
      {present.on ? (
        <div className={`${styles.layer} ${present.idle ? styles.idle : ''}`} role="region" aria-label="Theater, presenting">
          <Stage snaps={snaps} snap={snap} store={store} demo={demo} present />
        </div>
      ) : null}
    </>
  );
}
