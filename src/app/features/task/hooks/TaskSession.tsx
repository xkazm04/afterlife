'use client';

// The Task screens' session (ScreenDef.Session for 'task' and 'task/[id]'): what outlives one task's page. The screen host
// draws each /task/<id> as its own instance (a new Frame, its slices unread), so what belonged to the screen as a whole
// when the route kept one TaskScreen mounted lives here: the docket filters, the inspector's open panels, and the last
// docket rows read. A new task's window shows those rows while its own docket line is on its way (the same docket a
// moment ago, nothing amber in it), and takes the fresh rows when they land.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Panel } from '../components/inspector/TaskInspector';
import { NO_FILTERS, type Filters } from '../model/docket/filters';
import type { DocketRow } from '../model/docket/row';

export interface TaskSessionApi {
  filters: Filters;
  setFilters: (f: Filters) => void;
  inspOpen: boolean;
  setInspOpen: (open: boolean) => void;
  panels: Record<Panel, boolean>;
  setPanels: (fn: (p: Record<Panel, boolean>) => Record<Panel, boolean>) => void;
  /** The last docket rows a task's window read (undefined before the first). */
  rows?: readonly DocketRow[];
  keepRows: (rows: readonly DocketRow[]) => void;
}

const Ctx = createContext<TaskSessionApi | null>(null);

export function TaskSession({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [inspOpen, setInspOpen] = useState(true);
  const [panels, setPanels] = useState<Record<Panel, boolean>>({ words: false });
  const [rows, keepRows] = useState<readonly DocketRow[] | undefined>(undefined);
  const api = useMemo<TaskSessionApi>(() => ({ filters, setFilters, inspOpen, setInspOpen, panels, setPanels, rows, keepRows }), [filters, inspOpen, panels, rows]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Outside the session (a render test, the kit): a session of its own, local to the screen. */
function useLocalSession(): TaskSessionApi {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [inspOpen, setInspOpen] = useState(true);
  const [panels, setPanels] = useState<Record<Panel, boolean>>({ words: false });
  const [rows, keepRows] = useState<readonly DocketRow[] | undefined>(undefined);
  return { filters, setFilters, inspOpen, setInspOpen, panels, setPanels, rows, keepRows };
}

export function useTaskSession(): TaskSessionApi {
  const shared = useContext(Ctx);
  const local = useLocalSession();
  return shared ?? local;
}
