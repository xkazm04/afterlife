'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { ActionClass, Track } from '@/lib/demo/types';
import { useHotkeys } from '@/lib/keyboard/useHotkeys';
import type { Tier } from '@/schemas/tier';
import type { LiveSetupRead, SetupIllustrative } from '@/server/data/setup/types';
import { createSetupState, type SetupDemo } from '../model/flow/state';
import { SetupContext, type SetupApi } from './SetupContext';
import { useArmWrite } from './useArmWrite';
import { useEnrollWrite } from './useEnrollWrite';
import { useSetupFlow } from './useSetupFlow';
import { useSetupView } from './useSetupView';

const NONE: SetupIllustrative = { steps: false, tracks: false };

export interface SetupProviderProps {
  setup: SetupDemo;
  tracks: readonly Track[];
  classes: readonly ActionClass[];
  /** Live mode: what the server read; every state comes from it, and `illustrative` marks what is still the demo's. */
  live?: LiveSetupRead | null;
  illustrative?: SetupIllustrative;
  /** trust-policy.yml's start_tier (what an enrollment MR writes); null or absent when it was not read. */
  startTier?: Tier | null;
  children?: ReactNode;
}

/**
 * The Setup flow's state, held by the /setup layout so the unlock map and every /setup/[node] page share it: a probe or
 * an arm on a node's page is still there when you go back to the map. Esc clears the map's hover and filter.
 */
export function SetupProvider({ setup, tracks, classes, live = null, illustrative = NONE, startTier = null, children }: SetupProviderProps) {
  const byId = useMemo(() => Object.fromEntries(tracks.map((t) => [t.id, t])), [tracks]);
  const [initial] = useState(() => createSetupState(setup, Date.now(), live));
  const writes = useArmWrite(initial.project);
  const enroll = useEnrollWrite(initial.project);
  const { state, actions } = useSetupFlow(initial, writes);
  const view = useSetupView(state.doctor);
  useHotkeys([{ key: 'Escape', handler: view.clear, preventDefault: false }]);

  const api = useMemo<SetupApi>(
    () => ({ state, tracks: byId, classes, illustrative, view, actions, writes, enroll, startTier }),
    [state, byId, classes, illustrative, view, actions, writes, enroll, startTier],
  );
  return <SetupContext.Provider value={api}>{children}</SetupContext.Provider>;
}
