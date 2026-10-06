'use client';

import { useCallback, useState } from 'react';
import { toggleSelection, type Selection, type Side } from '../model/court/selection';

interface Held {
  taskId: string;
  sel: Selection;
}

/**
 * The selected claim or check. It belongs to one task: opening another task reads as "nothing selected", so no effect
 * has to clear it.
 */
export function useSelection(taskId: string) {
  const [held, setHeld] = useState<Held>({ taskId, sel: null });
  const sel = held.taskId === taskId ? held.sel : null;

  const pick = useCallback(
    (side: Side, id: string) => setHeld((h) => ({ taskId, sel: toggleSelection(h.taskId === taskId ? h.sel : null, side, id) })),
    [taskId],
  );
  const set = useCallback((next: Selection) => setHeld({ taskId, sel: next }), [taskId]);
  const clear = useCallback(() => setHeld({ taskId, sel: null }), [taskId]);
  return { sel, pick, set, clear };
}
