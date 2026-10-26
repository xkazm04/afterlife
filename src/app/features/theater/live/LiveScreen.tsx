'use client';

import { useMemo } from 'react';
import { Reveal } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { bindKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import type { StartData } from '@/server/actions/runs/start/types';
import { usePresent } from '../hooks/usePresent';
import { LIVE_KEYMAP } from '../model/keymap';
import { StartCard, useNewRun } from '../start/NewRun';
import pending from '../components/TheaterPending.module.css';
import outer from '../TheaterScreen.module.css';
import { LiveStage } from './components/LiveStage';
import { useLivePayload } from './hooks/useLivePayload';
import { selectLive, type WaveFocus } from './model/select';
import type { LivePayload } from './model/types';

/**
 * Theater's third film, LIVE: the runner's own belay.run/0 files, polled every 2 s, as a header (running, doing what,
 * going well, needs me), the running lane and a rail of finished lanes. No transport: nothing to seek in a live run.
 * Present mode keeps working (F, Esc). A quiet runner freezes the frame and says STALE; it never invents motion.
 * With no wave running the film has nothing live to film: its entry is the pre-run panel ("Start a run", `start/`),
 * and the toolbar's "New run…" opens the same panel as a sheet anytime.
 */
export function LiveScreen({ initial, focus, start }: { initial: LivePayload; focus?: WaveFocus; start?: StartData }) {
  const { payload, now } = useLivePayload(initial);
  const v = useMemo(() => selectLive(payload, now, focus), [payload, now, focus]);
  const present = usePresent();
  useHotkeys(bindKeymap(LIVE_KEYMAP, { present: [present.toggle, () => present.set(false)] }));
  const newRun = useNewRun(start);
  const status = v.stale ? 'STALE: the runner has been quiet for over 30 s; the frame is frozen' : 'Live from .afterlife/runs · F presents';
  return (
    <>
      <div className={present.on ? outer.hidden : outer.window}>
        <Window title="Theater" subtitle={v.repo === undefined ? 'live' : `live · ${v.repo}`} toolbar={newRun.button} status={<span role="status">{status}</span>}>
          {present.on ? null : (
            <Reveal order={1} slice="live" className={pending.fill}>
              <LiveStage v={v} present={false}>
                {start && v.phase !== 'running' && focus === undefined ? <StartCard data={start} /> : null}
              </LiveStage>
            </Reveal>
          )}
          {newRun.sheet}
        </Window>
      </div>
      {present.on ? (
        <div className={`${outer.layer} ${present.idle ? outer.idle : ''}`} role="region" aria-label="Theater, presenting">
          <LiveStage v={v} present />
        </div>
      ) : null}
    </>
  );
}
