'use client';

import { createContext, useContext } from 'react';
import type { ActionClass, Track } from '@/lib/demo/types';
import type { SetupState } from '../model/types';
import type { FlowActions } from './useSetupFlow';
import type { SetupView } from './useSetupView';

export interface SetupApi {
  state: SetupState;
  tracks: Readonly<Record<string, Track>>;
  classes: readonly ActionClass[];
  view: SetupView;
  actions: FlowActions;
  /** Show the inspector (a pick opens it). */
  openInspector: () => void;
}

export const SetupContext = createContext<SetupApi | null>(null);

export function useSetup(): SetupApi {
  const api = useContext(SetupContext);
  if (!api) throw new Error('useSetup needs a SetupContext above it');
  return api;
}
