'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import type { CyclesData } from '../model/build';
import { gridView } from '../model/grid';
import type { Cycle } from '../model/types';

/** The Cycles screen state: which cycle is selected (the running one to start), and the grid built once. */
export function useCycles(data: CyclesData) {
  const startId = (data.cycles.find((c) => c.state === 'running') ?? data.cycles[data.cycles.length - 1])?.id ?? '';
  const [selectedId, setSelectedId] = useState(startId);
  const grid = useMemo(() => gridView(data.day0, data.cycles), [data]);
  const index = Math.max(0, data.cycles.findIndex((c) => c.id === selectedId));
  // buildCycles always yields at least the running and the planned cycle.
  const selected = data.cycles[index] as Cycle;

  /** Left and right walk the cycles; Home and End jump to the first and the planned one. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const at = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: data.cycles.length - 1 }[e.key];
      if (at == null) return;
      e.preventDefault();
      const next = data.cycles[Math.max(0, Math.min(data.cycles.length - 1, at))];
      if (next) setSelectedId(next.id);
    },
    [data.cycles, index],
  );

  return { grid, selected, select: setSelectedId, onKeyDown };
}

export type CyclesApi = ReturnType<typeof useCycles>;
