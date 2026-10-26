'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRevalidate, type SliceState } from '@/components/shell/host';
import type { ActionClass, Track } from '@/lib/demo/types';
import type { Tier } from '@/schemas/tier';
import type { LiveSetupRead, SetupIllustrative } from '@/server/data/setup/types';
import { arrivalOf, projectOf, type SetupCatalogue } from '../model/arrive/arrive';
import { createSetupState, type SetupDemo } from '../model/flow/state';
import type { DoctorRow, SetupState } from '../model/types';
import { SetupFeedContext, type SetupFeed } from './session/feed';
import { SetupContext, type SetupApi } from './SetupContext';
import { useArmWrite } from './useArmWrite';
import { useEnrollWrite } from './useEnrollWrite';
import { useSetupFlow } from './useSetupFlow';
import { useSetupView } from './useSetupView';

const NONE: SetupIllustrative = { steps: false, tracks: false };
const NO_TRACKS: readonly Track[] = [];
const NO_CLASSES: readonly ActionClass[] = [];
const NO_ROWS: readonly DoctorRow[] = [];

/**
 * The Setup flow's state, shared by the unlock map and every /setup/[node] page: a probe or an arm on a node's page is
 * still there when you go back to the map. `seed` starts it (a test, the kit); without one it starts empty and the
 * screens feed it what their slices read (useSetupFeed): the catalogue makes the state, each live read lands in it.
 */
function SetupCore({ seed, children }: { seed: { state: SetupState; cat: SetupCatalogue } | null; children?: ReactNode }) {
  const [cat, setCat] = useState<SetupCatalogue | null>(seed?.cat ?? null);
  const byId = useMemo(() => Object.fromEntries((cat?.tracks ?? NO_TRACKS).map((t) => [t.id, t])), [cat]);
  const project = cat ? projectOf(cat) : '';
  const writes = useArmWrite(project);
  const enrollRaw = useEnrollWrite(project);
  const { state, actions: raw, dispatch } = useSetupFlow(seed?.state ?? null, writes);
  const view = useSetupView(state?.doctor ?? NO_ROWS);
  // A confirm's server action refreshes the route; on the screen host the screen re-reads instead (the one showing).
  const revalidate = useRevalidate();
  const reread = useCallback(() => {
    revalidate('setup');
    revalidate('setup/[node]');
  }, [revalidate]);
  const actions = useMemo(
    () => ({ ...raw, armSend: (id: string) => raw.armSend(id).then(reread), disarm: (id: string) => raw.disarm(id).then(reread) }),
    [raw, reread],
  );
  const enroll = useMemo(() => ({ ...enrollRaw, send: (id: string) => enrollRaw.send(id).finally(reread) }), [enrollRaw, reread]);

  const last = useRef<Partial<Record<string, unknown>>>({});
  const feed = useCallback<SetupFeed>(
    (part, s: SliceState<unknown>) => {
      if (s.state === 'unread') return;
      const key = s.state === 'ok' ? s.data : `error:${s.reason}`;
      if (last.current[part] === key) return; // the same arrival again (a screen shown again): nothing new
      last.current[part] = key;
      const a = arrivalOf(part, s, new Date());
      if (!a) return;
      if (a.t === 'catalogue-read') setCat(a.cat);
      dispatch(a);
    },
    [dispatch],
  );

  const api = useMemo<SetupApi | null>(
    () =>
      state && cat
        ? { state, tracks: byId, classes: cat.classes ?? NO_CLASSES, illustrative: cat.illustrative ?? NONE, view, actions, writes, enroll, startTier: cat.startTier ?? null }
        : null,
    [state, cat, byId, view, actions, writes, enroll],
  );
  return (
    <SetupFeedContext.Provider value={feed}>
      <SetupContext.Provider value={api}>{children}</SetupContext.Provider>
    </SetupFeedContext.Provider>
  );
}

/** The screen host's Session for 'setup' and 'setup/[node]': mounted once while either is, fed by their slices. */
export function SetupSession({ children }: { children: ReactNode }) {
  return <SetupCore seed={null}>{children}</SetupCore>;
}

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

/** The flow seeded at once from a whole read (tests and specimens; the screens get theirs from the Session). */
export function SetupProvider({ setup, tracks, classes, live = null, illustrative = NONE, startTier = null, children }: SetupProviderProps) {
  const [seed] = useState(() => ({
    state: createSetupState(setup, Date.now(), live),
    cat: {
      setup, tracks: [...tracks], classes: [...classes], illustrative, mode: live ? 'live' : 'demo',
      ...(startTier ? { startTier } : {}),
      ...(live ? { live: { group: live.group, host: live.host, project: live.project, projects: [...live.projects] } } : {}),
    } satisfies SetupCatalogue,
  }));
  return <SetupCore seed={seed}>{children}</SetupCore>;
}
