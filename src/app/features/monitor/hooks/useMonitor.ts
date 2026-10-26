'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { FleetProject } from '@/lib/demo/types';
import { repollAction } from '@/server/actions/repollAction';
import { notWatchedMessage, rejectedMessage, repollMessage, repollPlan, repollingMessage, simulateRepoll } from '../model/mode';
import { leadsOf, totalsOf } from '../model/totals';
import type { MarkKind, MonitorData } from '../model/types';

/** What the pointer is over: a project's beat or a lead's plate. Only the readout listens. */
export type Hover = { kind: 'project'; id: string } | { kind: 'lead'; group: string } | null;

/** Before the fleet is read (the screen host's core slice): no projects, no groups, nothing to act on. */
const NONE: readonly FleetProject[] = [];
const NO_GROUPS: readonly string[] = [];

/**
 * The Monitor as the screen holds it: the projects, the selected beat, the lead opened into named cells, and the lit mark.
 * Demo: resolving a decision counts it down and re-polling resets a feed's age, both in the browser only. Live: neither
 * is claimed here; Resolve opens Needs you and Re-poll runs a real poll on the server (repollAction), and the screen's
 * fresh data (`onPolled` re-reads it) replaces this screen's copy. `data` is absent until the fleet is read: the state
 * starts empty and takes the fleet (and the deep project as the pick) the moment it lands.
 */
export function useMonitor(data?: MonitorData, onPolled?: () => void) {
  const list = data?.projects ?? NONE;
  const [projects, setProjects] = useState<readonly FleetProject[]>(list);
  const [seen, setSeen] = useState(list);
  const [selected, setSelected] = useState<string | null>(data?.deepId ?? null);
  if (seen !== list) {
    // a fresh snapshot (the first read landing, a live re-poll, a re-read on return) replaces this screen's copy
    if (seen === NONE && data) setSelected((s) => s ?? data.deepId);
    setSeen(list);
    setProjects(list);
  }
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [mark, setMark] = useState<MarkKind | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const polling = useRef<Set<string>>(new Set());

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const leads = useMemo(() => leadsOf(data?.groups ?? NO_GROUPS, projects), [data?.groups, projects]);
  const totals = useMemo(() => totalsOf(projects), [projects]);

  /** Demo only: marks one of the deep project's decisions done and lowers its count. A decision resolves once. Live claims nothing. */
  const resolve = useCallback(
    (needId: string) => {
      if (!data || data.mode === 'live' || done.has(needId)) return;
      const deep = data.deepId;
      setDone((d) => new Set(d).add(needId));
      setProjects((list) => list.map((p) => (p.id === deep ? { ...p, needsYou: Math.max(0, p.needsYou - 1) } : p)));
    },
    [done, data],
  );

  /** Re-polls one feed and says how it went through `say`. Live: the server polls; "Re-polled" only once it resolved ok. */
  const repoll = useCallback(
    (id: string, say: (message: string) => void) => {
      const p = byId.get(id);
      if (!p || !data) return;
      const plan = repollPlan(data.mode, p);
      if (plan === 'none') return say(notWatchedMessage(p.name));
      if (plan === 'simulate') {
        const r = simulateRepoll(p);
        if (r.reset) setProjects((list) => list.map((x) => (x.id === id ? { ...x, feed: { ...x.feed, ageSec: 0 } } : x)));
        return say(r.message);
      }
      say(repollingMessage(p.name));
      // one server poll per feed at a time: the server throttles a second one and would answer with a failure for a poll that was in fact running
      if (polling.current.has(id)) return;
      polling.current.add(id);
      repollAction(id).then(
        (r) => {
          polling.current.delete(id);
          say(repollMessage(p.name, r));
          onPolled?.();
        },
        (e: unknown) => {
          polling.current.delete(id);
          say(rejectedMessage(p.name, e));
        },
      );
    },
    [byId, data, onPolled],
  );

  const toggleLead = useCallback((group: string) => setOpenLead((g) => (g === group ? null : group)), []);
  const toggleMark = useCallback((k: MarkKind) => setMark((m) => (m === k ? null : k)), []);

  return { projects, byId, leads, totals, done, selected, setSelected, openLead, toggleLead, mark, toggleMark, hover, setHover, resolve, repoll };
}
