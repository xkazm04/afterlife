'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useMaturity, type MaturityApi, type MaturityInput } from './hooks/useMaturity';
import type { DataMode } from './write/gap';

export interface MaturityShared {
  /** Null until the data is read: the screens draw their frame with dashes. */
  api: MaturityApi | null;
  /** The project a gap's MR is opened in: the id the server actions plan for. Absent until read. */
  project?: string;
  mode?: DataMode;
  /** A screen's core slice landed: merge it in (an identical read changes nothing). */
  arrive: (input: MaturityInput) => void;
}

const Shared = createContext<MaturityShared | null>(null);

const same = (a: MaturityInput, b: MaturityInput): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * The Maturity session, hoisted into the screen host (ScreenDef.Session, screen/host.tsx) so the crag and a stage's page
 * share one state: a gap picked or sent on the list is the same gap on the stage page, and a send's answer lands here
 * even after its screen left. Each screen feeds it its core slice (`arrive`). `initial` seeds it outside the host (tests).
 */
export function MaturityProvider({ initial = null, children }: { initial?: MaturityInput | null; children?: ReactNode }) {
  const [input, setInput] = useState<MaturityInput | null>(initial);
  const api = useMaturity(input);
  const arrive = useCallback((next: MaturityInput) => setInput((prev) => (prev && same(prev, next) ? prev : next)), []);
  const value = useMemo(() => ({ api, project: input?.project, mode: input?.mode, arrive }), [api, input, arrive]);
  return <Shared.Provider value={value}>{children}</Shared.Provider>;
}

/** The session for the host: no seed, every screen's slice fills it. */
export function MaturitySession({ children }: { children: ReactNode }) {
  return <MaturityProvider>{children}</MaturityProvider>;
}

export function useMaturityShared(): MaturityShared {
  const shared = useContext(Shared);
  if (!shared) throw new Error('Maturity screens render inside MaturityProvider (the screen host mounts it: screen/host.tsx)');
  return shared;
}
