'use client';

import { createContext, useContext } from 'react';
import type { ActionClass, Track } from '@/lib/demo/types';
import type { Tier } from '@/schemas/tier';
import type { SetupIllustrative } from '@/server/data/setup/types';
import type { SetupState } from '../model/types';
import type { ArmWrites } from './useArmWrite';
import type { EnrollWrites } from './useEnrollWrite';
import type { FlowActions } from './useSetupFlow';
import type { SetupView } from './useSetupView';

export interface SetupApi {
  state: SetupState;
  tracks: Readonly<Record<string, Track>>;
  classes: readonly ActionClass[];
  /** Live mode: the parts still drawn from the demo catalogue, each marked "demo" where it is shown. */
  illustrative: SetupIllustrative;
  view: SetupView;
  actions: FlowActions;
  /** The arm and disarm MRs as the server planned them. */
  writes: ArmWrites;
  /** The enrollment MRs (a track's first records, at start_tier) as the server planned them. */
  enroll: EnrollWrites;
  /** trust-policy.yml's start_tier as the server read it; null when it was not read. */
  startTier: Tier | null;
}

export const SetupContext = createContext<SetupApi | null>(null);

export function useSetup(): SetupApi {
  const api = useContext(SetupContext);
  if (!api) throw new Error('useSetup needs a SetupContext above it');
  return api;
}
