'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { plural } from '@/lib/format/plural';
import type { CyclesData } from '../model/build';
import { applyDesign, candidates, checkDesign, type Candidate } from '../model/design';
import { gridView } from '../model/grid';
import { openingCycle, openingDraft, toggleIn } from '../model/opening/opening';
import { walkTo } from './walk';

const NO_CANDIDATES: readonly Candidate[] = [];

/**
 * The Cycles screen state: which cycle is selected (the running one to start), and the design of the next cycle.
 * While you design, the grid previews the design live; a saved design becomes the planned cycle for this session
 * (the demo keeps it in this page's state only, until you leave or reload it, and says so).
 * `data` is absent until the screen stream's core slice lands: nothing is selected and nothing can be designed. The
 * opening pick (and, with ?design=1, the opening draft) are derived from the data until the person changes them, so the
 * data landing late, or a quiet re-read on return, never resets what was picked.
 */
export function useCycles(data: CyclesData | undefined, startDesign = false) {
  const { status } = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const all = useMemo(() => (data ? candidates(data) : NO_CANDIDATES), [data]);
  const [saved, setSaved] = useState<string[] | null>(null);
  // undefined: the person has not opened or closed the designer yet, so ?design=1's opening draft stands
  const [drafted, setDrafted] = useState<string[] | null | undefined>(undefined);
  const draft = drafted === undefined ? openingDraft(data, all, startDesign) : drafted;

  const pickOf = useCallback((ids: readonly string[]): Candidate[] => all.filter((c) => ids.includes(c.id)), [all]);
  const shown = draft ?? saved;
  const view = useMemo(() => (data && shown ? applyDesign(data, pickOf(shown)) : data), [data, shown, pickOf]);
  const grid = useMemo(() => (view ? gridView(view.day0, view.cycles) : null), [view]);
  const selectedId = picked ?? openingCycle(data, startDesign);
  const index = view ? Math.max(0, view.cycles.findIndex((c) => c.id === selectedId)) : -1;
  // buildCycles always yields at least the running and the planned cycle.
  const selected = view?.cycles[index];
  const planned = view?.cycles.find((c) => c.state === 'planned');

  /** Left and right walk the cycles; Home and End jump to the first and the planned one. Not while designing. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!view) return;
      const at = draft ? null : walkTo(e.key, index, view.cycles.length, e.metaKey || e.ctrlKey || e.altKey);
      if (at == null) return;
      e.preventDefault();
      const next = view.cycles[at];
      if (next) setPicked(next.id);
    },
    [view, index, draft],
  );

  const initialPicks = openingDraft(data, all, true) ?? [];
  const design = {
    candidates: all,
    draft,
    picks: draft ? pickOf(draft) : [],
    problems: draft ? checkDesign(pickOf(draft)) : [],
    start: () => {
      if (!planned) return;
      setPicked(planned.id);
      setDrafted(saved ?? initialPicks);
    },
    toggle: (id: string) => setDrafted(toggleIn(draft, id)),
    cancel: () => setDrafted(null),
    save: () => {
      if (!draft || checkDesign(pickOf(draft)).length) return;
      setSaved(draft);
      setDrafted(null);
      status(`${planned?.id ?? 'The next cycle'} designed: ${plural(draft.length, 'change')} · kept until you leave this page (demo)`);
    },
    saved: saved != null,
  };

  return { view, grid, selected, select: setPicked, onKeyDown, design };
}

export type CyclesApi = ReturnType<typeof useCycles>;
