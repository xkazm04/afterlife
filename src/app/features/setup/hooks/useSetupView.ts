'use client';

import { useCallback, useMemo, useState } from 'react';
import { useHostNav } from '@/components/shell/host';
import { GRAPH } from '../model/map/appGraph';
import { hotSets, type Hot } from '../model/map/hot';
import { nodeHref } from '../model/nodeKey';
import type { CapStatus, DoctorRow, Focus } from '../model/types';

export interface SetupView {
  /** The doctor lozenge filter lighting capabilities of one status. */
  capFilter: CapStatus | null;
  hot: Hot | null;
  /** Click a node: open its page (/setup/[node]). */
  pick: (f: Focus) => void;
  /** Go to a node from another node's page. */
  go: (f: Focus) => void;
  /** Back to the unlock map. */
  home: () => void;
  setHover: (f: Focus | null) => void;
  toggleFilter: (s: CapStatus) => void;
  /** Esc: clear the hover and the filter. */
  clear: () => void;
}

/** What the map is lit around: a hover or the lozenge filter. Picking a node navigates to its page (the screen host draws it in place). */
export function useSetupView(doctor: readonly DoctorRow[]): SetupView {
  const { navigate } = useHostNav();
  const [hover, setHover] = useState<Focus | null>(null);
  const [capFilter, setCapFilter] = useState<CapStatus | null>(null);

  const go = useCallback((f: Focus) => {
    setHover(null);
    navigate(nodeHref(f));
  }, [navigate]);
  const home = useCallback(() => navigate('/setup'), [navigate]);
  const toggleFilter = useCallback((s: CapStatus) => {
    setCapFilter((cur) => (cur === s ? null : s));
    setHover(null);
  }, []);
  const clear = useCallback(() => {
    setHover(null);
    setCapFilter(null);
  }, []);

  const hot = useMemo(() => hotSets(GRAPH, hover, capFilter, doctor), [hover, capFilter, doctor]);
  return { capFilter, hot, pick: go, go, home, setHover, toggleFilter, clear };
}
