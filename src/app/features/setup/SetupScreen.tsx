'use client';

import { Reveal, useSlice } from '@/components/shell/host';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { UnlockMap } from './components/map/UnlockMap';
import { MapPending, StatusPending, SummaryPending, ToolbarPending } from './components/pending/SetupPending';
import { SetupLegend } from './components/SetupLegend';
import { SetupStatus } from './components/SetupStatus';
import { SetupSummary } from './components/summary/SetupSummary';
import { SetupToolbar } from './components/toolbar/SetupToolbar';
import { useSetupMaybe } from './hooks/SetupContext';
import { useSetupFeed } from './hooks/session/feed';
import styles from './SetupScreen.module.css';

/**
 * Setup: the unlock map. Steps 0-14, the eight tracks in arm order and the doctor capabilities, joined by
 * drawn edges, under a strip of where you stand. A click (or Enter) on a node opens its page, /setup/[node].
 * Probes move steps, MRs arm tracks, and Afterlife writes only on a click, after showing the server's plan.
 * Esc clears the hover and the filter; Tab walks the map. The state lives in the Setup session (SetupProvider.tsx),
 * shared with the node pages; this screen feeds it its slices. Until the catalogue lands: the same window, dashes.
 */
export function SetupScreen() {
  useSetupFeed();
  const api = useSetupMaybe();
  const catalogue = useSlice<unknown>('catalogue');
  const state = api?.state;
  return (
    <Window
      title="Setup"
      subtitle={state ? `${state.group} / ${state.project}` : '— / —'}
      toolbar={api ? <SetupToolbar /> : <ToolbarPending />}
      status={api ? <SetupStatus /> : <StatusPending />}
      help={<SetupLegend />}
      helpTitle="Legend"
    >
      <PaneScroll padded={false}>
        <Reveal order={1} slice="catalogue">
          {api ? <SetupSummary /> : <SummaryPending />}
        </Reveal>
        <Reveal order={2} slice="catalogue" className={styles.mapRegion}>
          {api ? <UnlockMap /> : <MapPending reason={catalogue.state === 'error' ? catalogue.reason : undefined} />}
        </Reveal>
      </PaneScroll>
    </Window>
  );
}
