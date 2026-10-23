'use client';

import { useMemo, useState } from 'react';
import { Window } from '@/components/shell/Window';
import { Stage } from './components/stage/Stage';
import { StatusLine } from './components/chrome/StatusLine';
import { TakesSidebar } from './components/chrome/TakesSidebar';
import { TheaterHelp } from './components/chrome/TheaterHelp';
import { Transport } from './components/chrome/Transport';
import { BeatInspector } from './components/inspector/BeatInspector';
import { usePresent } from './hooks/usePresent';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useReplaySlice } from './hooks/useReplaySlice';
import { useReplayStore } from './hooks/useReplayStore';
import { useTheaterActions } from './hooks/useTheaterActions';
import { useTheaterKeys } from './hooks/useTheaterKeys';
import { filmSnapshots } from './model/derive/snapshots';
import { rangeLabel, readoutFrom, viewOf } from './model/replay/state';
import { shallowEqual } from './model/replay/store';
import type { TheaterData } from './model/types';
import styles from './TheaterScreen.module.css';

/**
 * Theater: a film replayed as one change climbing the loop. Route /theater. The film is the deep project's own
 * belay-ledger, one take per MR, when it names an MR; else the illustrative slice (seq 480-520), always labelled so.
 * An address the film cannot honour (`?mr=` the ledger has no events for, `#seq=` it does not hold) is said in the
 * status bar, never played in silence as another run.
 */
export function TheaterScreen({ film, demo, subtitle }: TheaterData) {
  const snaps = useMemo(() => filmSnapshots(film, demo?.stages ?? []), [film, demo]);
  const [missingSeq, setMissingSeq] = useState<number | null>(null);
  const store = useReplayStore(film, setMissingSeq);
  const present = usePresent();
  const reduced = useReducedMotion();
  const actions = useTheaterActions(store);
  useTheaterKeys(actions, present, { takes: film.takes.length, entries: film.entries.length });

  // Everything except the film position: the screen re-renders on entry, take, marks and transport changes only.
  const v = useReplaySlice(store, viewOf, shallowEqual);
  const snap = snaps[v.i];
  // A film with no beats has nothing to frame: say so inside the window instead of drawing a blank pane.
  if (!snap) {
    return (
      <Window title="Theater" subtitle={subtitle}>
        <p className={styles.empty}>
          This film has no beats to play. A take appears once an agent has acted on a merge request in the ledger.
        </p>
      </Window>
    );
  }
  const range = rangeLabel(v);
  const readout = readoutFrom(v);
  const notice =
    film.missing !== undefined
      ? `!${film.missing} has no events in the ledger: the newest runs play instead.`
      : missingSeq !== null
        ? `seq ${missingSeq} is not on this film: take 1 plays instead.`
        : null;

  return (
    <>
      <div className={present.on ? styles.hidden : styles.window}>
        <Window
          title="Theater"
          subtitle={subtitle}
          toolbar={<Transport playing={v.playing} loop={v.loop} readout={readout} actions={actions} onPresent={() => present.set(true)} reduced={reduced} />}
          sidebar={<TakesSidebar takes={film.takes} take={v.take} counts={v.counts} range={range} marked={v.mark !== null} actions={actions} />}
          inspector={<BeatInspector snap={snap} film={film} demo={demo} onSeek={actions.seek} />}
          status={
            <>
              {notice ? <span role="status">{notice} · </span> : null}
              <StatusLine state={v} />
            </>
          }
          help={<TheaterHelp film={film} />}
          helpTitle="Keys and marks"
        >
          {present.on ? null : <Stage snaps={snaps} snap={snap} store={store} film={film} demo={demo} present={false} />}
        </Window>
      </div>
      {present.on ? (
        <div className={`${styles.layer} ${present.idle ? styles.idle : ''}`} role="region" aria-label="Theater, presenting">
          <Stage snaps={snaps} snap={snap} store={store} film={film} demo={demo} present cue={v.left} />
        </div>
      ) : null}
    </>
  );
}
