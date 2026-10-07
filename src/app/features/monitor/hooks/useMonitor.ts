'use client';

import { useCallback, useMemo, useState } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { repollAction } from '@/server/actions/repollAction';
import { notWatchedMessage, rejectedMessage, repollMessage, repollPlan, repollingMessage, simulateRepoll } from '../model/mode';
import { leadsOf, totalsOf } from '../model/totals';
import type { MarkKind, MonitorData } from '../model/types';

/** What the pointer is over: a project's beat or a lead's plate. Only the readout listens. */
export type Hover = { kind: 'project'; id: string } | { kind: 'lead'; group: string } | null;

/**
 * The Monitor as the screen holds it: the projects, the selected beat, the lead opened into named cells, and the lit mark.
 * Demo: resolving a decision counts it down and re-polling resets a feed's age, both in the browser only. Live: neither
 * is claimed here; Resolve opens Needs you and Re-poll runs a real poll on the server (repollAction), and the route's
 * fresh data replaces this screen's copy.
 */
export function useMonitor(data: MonitorData) {
  const [projects, setProjects] = useState<readonly FleetProject[]>(data.projects);
  const [seen, setSeen] = useState(data.projects);
  if (seen !== data.projects) {
    // the route rendered again with a fresh snapshot (a live re-poll, a reload): it replaces this screen's copy
    setSeen(data.projects);
    setProjects(data.projects);
  }
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(data.deepId);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [mark, setMark] = useState<MarkKind | null>(null);
  const [hover, setHover] = useState<Hover>(null);

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const leads = useMemo(() => leadsOf(data.groups, projects), [data.groups, projects]);
  const totals = useMemo(() => totalsOf(projects), [projects]);

  /** Demo only: marks one of the deep project's decisions done and lowers its count. A decision resolves once. Live claims nothing. */
  const resolve = useCallback(
    (needId: string) => {
      if (data.mode === 'live' || done.has(needId)) return;
      setDone((d) => new Set(d).add(needId));
      setProjects((list) => list.map((p) => (p.id === data.deepId ? { ...p, needsYou: Math.max(0, p.needsYou - 1) } : p)));
    },
    [done, data.deepId, data.mode],
  );

  /** Re-polls one feed and says how it went through `say`. Live: the server polls; "Re-polled" only once it resolved ok. */
  const repoll = useCallback(
    (id: string, say: (message: string) => void) => {
      const p = byId.get(id);
      if (!p) return;
      const plan = repollPlan(data.mode, p);
      if (plan === 'none') return say(notWatchedMessage(p.name));
      if (plan === 'simulate') {
        const r = simulateRepoll(p);
        if (r.reset) setProjects((list) => list.map((x) => (x.id === id ? { ...x, feed: { ...x.feed, ageSec: 0 } } : x)));
        return say(r.message);
      }
      say(repollingMessage(p.name));
      repollAction(id).then(
        (r) => say(repollMessage(p.name, r)),
        (e: unknown) => say(rejectedMessage(p.name, e)),
      );
    },
    [byId, data.mode],
  );

  const toggleLead = useCallback((group: string) => setOpenLead((g) => (g === group ? null : group)), []);
  const toggleMark = useCallback((k: MarkKind) => setMark((m) => (m === k ? null : k)), []);

  return { projects, byId, leads, totals, done, selected, setSelected, openLead, setOpenLead, toggleLead, mark, toggleMark, hover, setHover, resolve, repoll };
}

export type MonitorState = ReturnType<typeof useMonitor>;
