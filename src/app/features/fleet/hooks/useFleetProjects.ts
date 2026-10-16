'use client';

import { useCallback, useMemo, useState } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { needsSum } from '../model/groups';
import { repoll } from '../model/needs';

/**
 * The fleet as the screen holds it: the source's projects, plus demo mode's simulated re-poll, which resets a feed's age.
 * Nothing leaves the browser. When the route renders again with fresh projects (live mode, after a re-poll), the screen
 * takes them as they are.
 */
export function useFleetProjects(initial: readonly FleetProject[]) {
  const [projects, setProjects] = useState<readonly FleetProject[]>(initial);
  const [from, setFrom] = useState(initial);
  if (from !== initial) {
    setFrom(initial);
    setProjects(initial);
  }

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const waiting = useMemo(() => needsSum(projects), [projects]);

  /** Re-polls one feed; returns the sentence for the status bar. */
  const poll = useCallback(
    (id: string): string => {
      const p = byId.get(id);
      if (!p) return '';
      const r = repoll(p);
      if (r.ok) setProjects((list) => list.map((x) => (x.id === id ? r.project : x)));
      return r.message;
    },
    [byId],
  );

  return { projects, byId, waiting, poll };
}
