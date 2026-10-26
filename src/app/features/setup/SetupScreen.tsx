'use client';

import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { UnlockMap } from './components/map/UnlockMap';
import { SetupLegend } from './components/SetupLegend';
import { SetupStatus } from './components/SetupStatus';
import { SetupSummary } from './components/summary/SetupSummary';
import { SetupToolbar } from './components/toolbar/SetupToolbar';
import { useSetup } from './hooks/SetupContext';

/**
 * Setup: the unlock map. Steps 0-14, the eight tracks in arm order and the doctor capabilities, joined by
 * drawn edges, under a strip of where you stand. A click (or Enter) on a node opens its page, /setup/[node].
 * Probes move steps, MRs arm tracks, and Afterlife writes only on a click, after showing the server's plan.
 * Esc clears the hover and the filter; Tab walks the map. The state lives in `SetupProvider`, in the /setup layout.
 */
export function SetupScreen() {
  const { state } = useSetup();
  return (
    <Window title="Setup" subtitle={`${state.group} / ${state.project}`} toolbar={<SetupToolbar />} status={<SetupStatus />} help={<SetupLegend />} helpTitle="Legend">
      <PaneScroll padded={false}>
        <SetupSummary />
        <UnlockMap />
      </PaneScroll>
    </Window>
  );
}
