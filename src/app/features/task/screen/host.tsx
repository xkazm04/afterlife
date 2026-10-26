'use client';

// The Task screens for the screen host (docs/features/screen-host.md). The window, its toolbar (verdict lozenge, class
// menu, Replay), the tab row and every region's box paint in the click's frame; the rest fills from the stream
// (screen/slices.ts). Reveal order for /task/<id>:
//   0  window chrome, toolbar, tabs row                       at once
//   1  docket (sidebar)                                       docket (the session's last rows meanwhile, on a task switch)
//   2  header (title, tiers, crumb)                           detail
//   3  verdict equation                                       detail
//   4  the open tab: Court, Receipt chain                     detail  (the Ledger tab: ledger)
//   5  inspector                                              detail
//   -  Replay and the Ledger tab's count enable in place when the ledger lands; the subtitle and status when page lands
// /task has one slice: a redirect to the first task (the query carried), or an empty docket drawn in the Task window.
import { useEffect, useMemo } from 'react';
import { Reveal, Unread, useSlice, type ScreenDef } from '@/components/shell/host';
import type { PageFacts } from '../model/build/loadPage';
import type { DocketRow } from '../model/docket/row';
import type { TaskLedger, TaskView } from '../model/types';
import { TaskSession, useTaskSession } from '../hooks/TaskSession';
import { TaskEmpty } from '../TaskEmpty';
import { TaskNotFound } from '../TaskNotFound';
import { TaskScreen } from '../TaskScreen';

/** The open task as the detail slice sends it: whole, but its ledger comes in its own slice. */
export type TaskDetail = Omit<TaskView, 'ledger' | 'ledgerCheck'>;

const NO_LEDGER: TaskLedger = { ledger: [], ledgerCheck: { hash: 'illustrative', brokenAt: null } };

function TaskFrame({ params, search }: { params: Readonly<Record<string, string>>; search: URLSearchParams }) {
  const docket = useSlice<DocketRow[]>('docket');
  const detail = useSlice<TaskDetail>('detail');
  const ledger = useSlice<TaskLedger>('ledger');
  const page = useSlice<PageFacts>('page');
  const session = useTaskSession();
  const { keepRows } = session;
  const fresh = docket.state === 'ok' ? docket.data : undefined;
  useEffect(() => {
    if (fresh) keepRows(fresh);
  }, [fresh, keepRows]);
  const one = detail.state === 'ok' ? detail.data : undefined;
  const rows = ledger.state === 'ok' ? ledger.data : NO_LEDGER;
  // one object per read, so the screen's effects and memos see a new task only when a slice brings one
  const task = useMemo<TaskView | undefined>(() => (one ? { ...one, ...rows } : undefined), [one, rows]);
  return (
    <TaskScreen
      id={params.id ?? ''}
      rows={fresh ?? session.rows}
      task={task}
      ledgerRead={ledger.state === 'ok'}
      page={page.state === 'ok' ? page.data : undefined}
      search={search}
      detailError={detail.state === 'error' ? detail.reason : undefined}
    />
  );
}

/** /task: the first task (the host follows the redirect line), or the docket says it holds none, inside the Task window. */
function TaskIndexFrame() {
  const docket = useSlice<unknown[]>('docket');
  return (
    <TaskEmpty>
      {docket.state === 'ok' ? undefined : docket.state === 'error' ? (
        <p role="status">The docket could not be read: {docket.reason}</p>
      ) : (
        <Reveal slice="docket">
          <p aria-busy="true">
            Opening the docket&apos;s first task · <Unread label="tasks not read yet" /> tasks
          </p>
        </Reveal>
      )}
    </TaskEmpty>
  );
}

export const screens: readonly ScreenDef[] = [
  { key: 'task', ready: true, slices: ['docket'], Frame: TaskIndexFrame, Session: TaskSession, title: () => 'Afterlife · Task' },
  {
    key: 'task/[id]',
    ready: true,
    slices: ['docket', 'detail', 'ledger', 'page'],
    // a j/k step to another task re-reads only the task: the docket and the page's facts are every task's
    paramSlices: ['detail', 'ledger'],
    Frame: TaskFrame,
    Session: TaskSession,
    title: (p) => `Afterlife · Task · ${p.id}`,
    NotFound: TaskNotFound,
  },
];
