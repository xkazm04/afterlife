'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useCallback, useMemo, useState } from 'react';
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

/** What the map is lit around: a hover or the lozenge filter. Picking a node navigates to its page. */
export function useSetupView(doctor: readonly DoctorRow[]): SetupView {
  const router = useRouter();
  const [hover, setHover] = useState<Focus | null>(null);
  const [capFilter, setCapFilter] = useState<CapStatus | null>(null);

  const go = useCallback((f: Focus) => {
    setHover(null);
    startTransition(() => router.push(nodeHref(f)));
  }, [router]);
  const home = useCallback(() => startTransition(() => router.push('/setup')), [router]);
  // A hovered node is the page a click opens: prefetch it while the pointer rests there.
  const hoverAt = useCallback((f: Focus | null) => {
    setHover(f);
    if (f) router.prefetch(nodeHref(f));
  }, [router]);
  const toggleFilter = useCallback((s: CapStatus) => {
    setCapFilter((cur) => (cur === s ? null : s));
    setHover(null);
  }, []);
  const clear = useCallback(() => {
    setHover(null);
    setCapFilter(null);
  }, []);

  const hot = useMemo(() => hotSets(GRAPH, hover, capFilter, doctor), [hover, capFilter, doctor]);
  return { capFilter, hot, pick: go, go, home, setHover: hoverAt, toggleFilter, clear };
}
