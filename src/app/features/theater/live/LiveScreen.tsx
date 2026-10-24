'use client';

import { useMemo } from 'react';
import { Window } from '@/components/shell/Window';
import { bindKeymap } from '@/lib/keyboard/keymap';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { usePresent } from '../hooks/usePresent';
import { LIVE_KEYMAP } from '../model/keymap';
import outer from '../TheaterScreen.module.css';
import { LiveStage } from './components/LiveStage';
import { useLivePayload } from './hooks/useLivePayload';
import { selectLive, type WaveFocus } from './model/select';
import type { LivePayload } from './model/types';

/**
 * Theater's third film, LIVE: the runner's own belay.run/0 files, polled every 2 s, as a header (running, doing what,
 * going well, needs me), the running lane and a rail of finished lanes. No transport: nothing to seek in a live run.
 * Present mode keeps working (F, Esc). A quiet runner freezes the frame and says STALE; it never invents motion.
 */
export function LiveScreen({ initial, focus }: { initial: LivePayload; focus?: WaveFocus }) {
  const { payload, now } = useLivePayload(initial);
  const v = useMemo(() => selectLive(payload, now, focus), [payload, now, focus]);
  const present = usePresent();
  useHotkeys(bindKeymap(LIVE_KEYMAP, { present: [present.toggle, () => present.set(false)] }));
  const status = v.stale ? 'STALE: the runner has been quiet for over 30 s; the frame is frozen' : 'Live from .belay/runs · F presents';
  return (
    <>
      <div className={present.on ? outer.hidden : outer.window}>
        <Window title="Theater" subtitle={v.repo === undefined ? 'live' : `live · ${v.repo}`} status={<span role="status">{status}</span>}>
          {present.on ? null : <LiveStage v={v} present={false} />}
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
