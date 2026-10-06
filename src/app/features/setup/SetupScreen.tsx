'use client';

import { useMemo, useState } from 'react';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import type { ActionClass, Track } from '@/lib/demo/types';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import { SetupInspector } from './components/inspector/SetupInspector';
import { UnlockMap } from './components/map/UnlockMap';
import { SetupLegend } from './components/SetupLegend';
import { SetupStatus } from './components/SetupStatus';
import { SetupToolbar } from './components/toolbar/SetupToolbar';
import { SetupContext, type SetupApi } from './hooks/SetupContext';
import { useSetupFlow } from './hooks/useSetupFlow';
import { useSetupView } from './hooks/useSetupView';
import { createSetupState, type SetupDemo } from './model/flow/state';

/**
 * Setup: the unlock map. Steps 0-14, the eight tracks in arm order and the belay doctor capabilities, joined by
 * drawn edges. Probes move steps, MRs arm tracks, and Belay writes only on a click, after showing the command.
 * Esc clears the pick; Tab walks the map; Cmd/Ctrl+I toggles the inspector (the Window does that one).
 */
export function SetupScreen({ setup, tracks, classes }: { setup: SetupDemo; tracks: readonly Track[]; classes: readonly ActionClass[] }) {
  const byId = useMemo(() => Object.fromEntries(tracks.map((t) => [t.id, t])), [tracks]);
  const keys = useMemo(() => Object.fromEntries(tracks.map((t) => [t.id, t.key])), [tracks]);
  const [initial] = useState(() => createSetupState(setup, tracks, Date.now()));
  const { state, actions } = useSetupFlow(initial, keys);
  const view = useSetupView(state.doctor);
  const [inspOpen, setInspOpen] = useState(true);
  useHotkeys([{ key: 'Escape', handler: view.clear, preventDefault: false }]);

  const api = useMemo<SetupApi>(
    () => ({ state, tracks: byId, classes, view, actions, openInspector: () => setInspOpen(true) }),
    [state, byId, classes, view, actions],
  );

  return (
    <SetupContext.Provider value={api}>
      <Window
        title="Setup"
        subtitle={`${state.group} / ${state.project}`}
        toolbar={<SetupToolbar />}
        inspector={<SetupInspector />}
        inspectorOpen={inspOpen}
        onInspectorOpenChange={setInspOpen}
        status={<SetupStatus />}
        help={<SetupLegend />}
        helpTitle="Legend"
      >
        <PaneScroll padded={false}>
          <UnlockMap />
        </PaneScroll>
      </Window>
    </SetupContext.Provider>
  );
}
