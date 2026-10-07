'use client';

import { useCallback } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { repollAction } from '@/server/actions/repollAction';
import { repollMessage } from '../model/needs';

/**
 * Re-polls a project and says how it went in the status bar. Demo: the screen's own simulation (`simulate`: the feed's
 * age resets, nothing leaves the browser). Live: the repollAction server action runs one poll cycle and the route renders
 * again from the fresh snapshot; "Re-polled" is said only once that has resolved, and a failure says so. An unwatched
 * project has nothing to poll in either mode.
 */
export function useRepoll(mode: 'demo' | 'live', byId: ReadonlyMap<string, FleetProject>, simulate: (id: string) => string, say: (m: string) => void) {
  return useCallback(
    (id: string) => {
      const p = byId.get(id);
      if (!p) return;
      if (mode === 'demo' || p.state === 'not-set-up') {
        say(simulate(id));
        return;
      }
      say(`Re-polling ${p.name}…`);
      repollAction(id).then(
        (r) => say(repollMessage(p.name, r)),
        (e: unknown) => say(repollMessage(p.name, { ok: false, reason: e instanceof Error ? e.message : 'no answer' })),
      );
    },
    [mode, byId, simulate, say],
  );
}
