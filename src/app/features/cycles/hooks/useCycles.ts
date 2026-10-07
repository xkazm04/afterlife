'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import type { CyclesData } from '../model/build';
import { applyDesign, candidates, checkDesign, type Candidate } from '../model/design';
import { gridView } from '../model/grid';
import type { Cycle } from '../model/types';

/**
 * The Cycles screen state: which cycle is selected (the running one to start), and the design of the next cycle.
 * While you design, the grid previews the design live; a saved design becomes the planned cycle for this session
 * (the demo keeps it in the browser only, and says so).
 */
export function useCycles(data: CyclesData) {
  const { status } = useToast();
  const startId = (data.cycles.find((c) => c.state === 'running') ?? data.cycles[data.cycles.length - 1])?.id ?? '';
  const [selectedId, setSelectedId] = useState(startId);
  const all = useMemo(() => candidates(data), [data]);
  const initialPicks = useMemo(() => all.filter((c) => c.source === 'proposal' && !c.blocked).map((c) => c.id), [all]);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<string[] | null>(null);

  const pickOf = useCallback((ids: readonly string[]): Candidate[] => all.filter((c) => ids.includes(c.id)), [all]);
  const shown = draft ?? saved;
  const view = useMemo(() => (shown ? applyDesign(data, pickOf(shown)) : data), [data, shown, pickOf]);
  const grid = useMemo(() => gridView(view.day0, view.cycles), [view]);
  const index = Math.max(0, view.cycles.findIndex((c) => c.id === selectedId));
  // buildCycles always yields at least the running and the planned cycle.
  const selected = view.cycles[index] as Cycle;
  const planned = view.cycles.find((c) => c.state === 'planned');

  /** Left and right walk the cycles; Home and End jump to the first and the planned one. Not while designing. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (draft || e.metaKey || e.ctrlKey || e.altKey) return;
      const at = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: view.cycles.length - 1 }[e.key];
      if (at == null) return;
      e.preventDefault();
      const next = view.cycles[Math.max(0, Math.min(view.cycles.length - 1, at))];
      if (next) setSelectedId(next.id);
    },
    [view.cycles, index, draft],
  );

  const design = {
    candidates: all,
    draft,
    picks: draft ? pickOf(draft) : [],
    problems: draft ? checkDesign(pickOf(draft)) : [],
    start: () => {
      if (planned) setSelectedId(planned.id);
      setDraft(saved ?? initialPicks);
    },
    toggle: (id: string) => setDraft((d) => (d ? (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]) : d)),
    cancel: () => setDraft(null),
    save: () => {
      if (!draft || checkDesign(pickOf(draft)).length) return;
      setSaved(draft);
      setDraft(null);
      status(`${planned?.id ?? 'The next cycle'} designed: ${draft.length} change${draft.length === 1 ? '' : 's'} · kept in this browser session (demo)`);
    },
    saved: saved != null,
  };

  return { view, grid, selected, select: setSelectedId, onKeyDown, design };
}

export type CyclesApi = ReturnType<typeof useCycles>;
