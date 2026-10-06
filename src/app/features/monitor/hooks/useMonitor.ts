'use client';

import { useCallback, useMemo, useState } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { formatAge } from '@/lib/format/time';
import { leadsOf, totalsOf } from '../model/totals';
import type { MarkKind, MonitorData } from '../model/types';

/** What the pointer is over: a project's beat or a lead's plate. Only the readout listens. */
export type Hover = { kind: 'project'; id: string } | { kind: 'lead'; group: string } | null;

/**
 * The Monitor as the screen holds it: the projects (resolving a decision counts it down), the selected beat, the lead
 * opened into named cells, and the lit mark. Nothing leaves the browser.
 */
export function useMonitor(data: MonitorData) {
  const [projects, setProjects] = useState<readonly FleetProject[]>(data.projects);
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(data.deepId);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [mark, setMark] = useState<MarkKind | null>(null);
  const [hover, setHover] = useState<Hover>(null);

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const leads = useMemo(() => leadsOf(data.groups, projects), [data.groups, projects]);
  const totals = useMemo(() => totalsOf(projects), [projects]);

  /** Marks one of the deep project's decisions done and lowers its count. A decision resolves once. */
  const resolve = useCallback(
    (needId: string) => {
      if (done.has(needId)) return;
      setDone((d) => new Set(d).add(needId));
      setProjects((list) => list.map((p) => (p.id === data.deepId ? { ...p, needsYou: Math.max(0, p.needsYou - 1) } : p)));
    },
    [done, data.deepId],
  );

  /** Re-polls one feed: a healthy watched feed answers (age 0), a broken one says why. Returns the status sentence. */
  const repoll = useCallback(
    (id: string): string => {
      const p = byId.get(id);
      if (!p) return '';
      if (p.state === 'not-set-up') return `${p.name}: not watched, nothing to poll`;
      if (!p.feed.ok) return `Re-poll failed · ${p.name} · ${p.feed.error ?? 'no answer'} · last good ${formatAge(p.feed.ageSec)} ago`;
      setProjects((list) => list.map((x) => (x.id === id ? { ...x, feed: { ...x.feed, ageSec: 0 } } : x)));
      return `Re-polled ${p.name}`;
    },
    [byId],
  );

  const toggleLead = useCallback((group: string) => setOpenLead((g) => (g === group ? null : group)), []);
  const toggleMark = useCallback((k: MarkKind) => setMark((m) => (m === k ? null : k)), []);

  return { projects, byId, leads, totals, done, selected, setSelected, openLead, setOpenLead, toggleLead, mark, toggleMark, hover, setHover, resolve, repoll };
}

export type MonitorState = ReturnType<typeof useMonitor>;
