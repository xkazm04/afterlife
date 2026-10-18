'use client';

import { useCallback, useState } from 'react';
import { toggleSelection, type Selection, type Side } from '../model/court/selection';

interface Held {
  taskId: string;
  sel: Selection;
}

/**
 * The selected claim or check. It belongs to one task: opening another task reads as that task's `initial` selection (the
 * URL's ?check= / ?claim=, else its first deciding check, else nothing), so no effect has to reset it.
 */
export function useSelection(taskId: string, initial: Selection = null) {
  const [held, setHeld] = useState<Held>({ taskId, sel: initial });
  const sel = held.taskId === taskId ? held.sel : initial;

  const pick = useCallback(
    (side: Side, id: string) => setHeld((h) => ({ taskId, sel: toggleSelection(h.taskId === taskId ? h.sel : initial, side, id) })),
    [taskId, initial],
  );
  const set = useCallback((next: Selection) => setHeld({ taskId, sel: next }), [taskId]);
  const clear = useCallback(() => setHeld({ taskId, sel: null }), [taskId]);
  return { sel, pick, set, clear };
}
