'use client';

import { useCallback, useState } from 'react';
import type { TaskTab } from '../../model/tab';

interface Held {
  taskId: string;
  tab: TaskTab;
}

/**
 * The open tab under the verdict. Like the selection it belongs to one task: opening another task reads as that task's
 * `initial` tab (the URL's ?tab=, else the Court), so no effect has to reset it.
 */
export function useTaskTab(taskId: string, initial: TaskTab) {
  const [held, setHeld] = useState<Held>({ taskId, tab: initial });
  const tab = held.taskId === taskId ? held.tab : initial;
  const setTab = useCallback((next: TaskTab) => setHeld({ taskId, tab: next }), [taskId]);
  return { tab, setTab };
}
