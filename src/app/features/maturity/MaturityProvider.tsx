'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { DemoData } from '@/lib/demo';
import type { Stage } from '@/schemas';
import { useMaturity, type MaturityApi } from './hooks/useMaturity';
import type { DataMode } from './write/gap';

export interface MaturityShared {
  api: MaturityApi;
  /** The project a gap's MR is opened in: the id the server actions plan for. */
  project: string;
  mode: DataMode;
}

const Shared = createContext<MaturityShared | null>(null);

/**
 * The Maturity state, held by the /maturity layout so the crag and a stage's page share one session: a gap picked or sent
 * on the list is the same gap on the stage page (a layout stays mounted while you move between its pages).
 */
export function MaturityProvider({ maturity, stages, project, mode, children }: { maturity: DemoData['maturity']; stages: readonly Stage[]; project: string; mode: DataMode; children?: ReactNode }) {
  const api = useMaturity(maturity, stages, mode);
  return <Shared.Provider value={{ api, project, mode }}>{children}</Shared.Provider>;
}

export function useMaturityShared(): MaturityShared {
  const shared = useContext(Shared);
  if (!shared) throw new Error('Maturity screens render inside MaturityProvider (src/app/(app)/maturity/layout.tsx)');
  return shared;
}
