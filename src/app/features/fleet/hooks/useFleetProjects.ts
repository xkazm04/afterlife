'use client';

import { useCallback, useMemo, useState } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { repoll, resolveOne, waitingCount } from '../model/needs';

/**
 * The fleet as the screen holds it: the source's projects, plus demo mode's two simulations. Re-polling a feed resets its
 * age; resolving a decision counts it down on its project. Nothing leaves the browser. When the route renders again with
 * fresh projects (live mode, after a re-poll), the screen takes them as they are.
 */
export function useFleetProjects(initial: readonly FleetProject[]) {
  const [projects, setProjects] = useState<readonly FleetProject[]>(initial);
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [from, setFrom] = useState(initial);
  if (from !== initial) {
    setFrom(initial);
    setProjects(initial);
  }

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const waiting = useMemo(() => waitingCount(projects), [projects]);

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

  /** Marks one decision of a project done and lowers its count. A decision resolves once. */
  const resolve = useCallback(
    (projectId: string, needId: string) => {
      if (done.has(needId)) return;
      setDone((d) => new Set(d).add(needId));
      setProjects((list) => list.map((x) => (x.id === projectId ? resolveOne(x) : x)));
    },
    [done],
  );

  return { projects, byId, waiting, done, poll, resolve };
}
