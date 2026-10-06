'use client';

import { useCallback, useMemo, useState } from 'react';
import { GRAPH } from '../model/map/appGraph';
import { hotSets, type Hot } from '../model/map/hot';
import { focusEq, type CapStatus, type DoctorRow, type Focus } from '../model/types';

export interface SetupView {
  /** The picked node (the inspector shows it). */
  sel: Focus | null;
  /** The doctor lozenge filter lighting capabilities of one status. */
  capFilter: CapStatus | null;
  hot: Hot | null;
  /** Click a node: pick it, or unpick it when it is already picked. */
  pick: (f: Focus) => void;
  /** Go to a node from the inspector (never toggles off). */
  go: (f: Focus) => void;
  setHover: (f: Focus | null) => void;
  toggleFilter: (s: CapStatus) => void;
  /** Esc: clear the pick, the hover and the filter. */
  clear: () => void;
}

/** What the map is lit around: a pick, a hover, or the lozenge filter. Hover wins over pick. */
export function useSetupView(doctor: readonly DoctorRow[]): SetupView {
  const [sel, setSel] = useState<Focus | null>(null);
  const [hover, setHover] = useState<Focus | null>(null);
  const [capFilter, setCapFilter] = useState<CapStatus | null>(null);

  const pick = useCallback((f: Focus) => {
    setSel((cur) => (focusEq(cur, f) ? null : f));
    setHover(null);
    setCapFilter(null);
  }, []);
  const go = useCallback((f: Focus) => {
    setSel(f);
    setHover(null);
  }, []);
  const toggleFilter = useCallback((s: CapStatus) => {
    setCapFilter((cur) => (cur === s ? null : s));
    setSel(null);
    setHover(null);
  }, []);
  const clear = useCallback(() => {
    setSel(null);
    setHover(null);
    setCapFilter(null);
  }, []);

  const hot = useMemo(() => hotSets(GRAPH, hover ?? sel, capFilter, doctor), [hover, sel, capFilter, doctor]);
  return { sel, capFilter, hot, pick, go, setHover, toggleFilter, clear };
}
