'use client';

import { useEffect } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { Reveal, Unread } from '@/components/shell/host';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { ReceiptChain } from './components/chain/ReceiptChain';
import { Court } from './components/court/Court';
import { Docket, DocketPending } from './components/docket/Docket';
import { VerdictEquation } from './components/equation/VerdictEquation';
import { TaskHeader } from './components/header/TaskHeader';
import { TaskLegend } from './components/help/TaskLegend';
import { TaskInspector } from './components/inspector/TaskInspector';
import { DetailUnreadable, EquationPending, HeaderPending, InspectorPending, LedgerPending, PanePending, StatusPending } from './components/pending/TaskPending';
import { LedgerPanel } from './components/tabs/LedgerPanel';
import { TaskTabs } from './components/tabs/TaskTabs';
import { useTaskTab } from './components/tabs/useTaskTab';
import { ClassMenuButton } from './components/toolbar/ClassMenuButton';
import { ReplayButton } from './components/toolbar/ReplayButton';
import { VerdictLozenge } from './components/toolbar/VerdictLozenge';
import { usePageClock } from './hooks/usePageClock';
import { useReplay } from './hooks/useReplay';
import { useSelection } from './hooks/useSelection';
import { useTaskActions } from './hooks/useTaskActions';
import { useTaskKeys } from './hooks/useTaskKeys';
import { useTaskSession } from './hooks/TaskSession';
import { litLink, type Side } from './model/court/selection';
import { NO_FILTERS, statusLine, verdictCounts } from './model/docket/filters';
import type { DocketRow } from './model/docket/row';
import type { PageFacts } from './model/build/loadPage';
import { tabFromQuery, withTab } from './model/tab';
import type { TaskView } from './model/types';
import { keepForeignKeys, queryOf, selectionFromQuery, selectionHref } from './model/verdict/reasons';
import styles from './TaskScreen.module.css';

export interface TaskScreenProps {
  /** The task the address names. */
  id: string;
  /** The docket's rows; absent until read (the window draws dashes). */
  rows?: readonly DocketRow[];
  /** The open task whole; its ledger is empty until `ledgerRead`. Absent until read. */
  task?: TaskView;
  ledgerRead: boolean;
  page?: PageFacts;
  /** The URL's query: the selection (?check= / ?claim=) and tab (?tab=) the task opens on, once it is read. */
  search: URLSearchParams;
  /** Why the task could not be read (a fixed reason from the server). */
  detailError?: string;
}

/**
 * /task/[id]: one task's proof, cross-examined. The header and the verdict equation stay on top of the pane; under them one
 * tab at a time: the claims-against-checks Court, the Receipt chain, the Ledger (rows and trace). Everything about the
 * selection lives in the inspector; the docket is in the sidebar. This screen reads only: nothing on it writes. It opens
 * on the URL's ?check= / ?claim= (else the verdict's first deciding check) and ?tab= (else the Court), and keeps both in
 * the URL, so a reason has an address. The screen host draws it from four slices (screen/host.tsx): each part absent
 * until read draws the same box with dashes.
 */
export function TaskScreen({ id, rows, task, ledgerRead, page, search, detailError }: TaskScreenProps) {
  const session = useTaskSession();
  const clock = usePageClock(page);
  const q = queryOf(search);
  // the selection belongs to the task once it is read: until then the hook holds nothing, and the URL's pick waits
  const { sel, pick, set, clear } = useSelection(task?.id ?? '', task ? selectionFromQuery(task, q) : null);
  const { tab, setTab } = useTaskTab(id, tabFromQuery(q));
  const replay = useReplay(task, { onStart: clear });
  const { visible, applyFilters, run } = useTaskActions({ id, task, rows, session, sel, set, clear, tab, setTab, replay });
  // The selection is the address: a query-only replaceState the screen tracks itself, keeping the history entry's state
  // (Next's tree and the host's mark: never null). The open tab rides along; keys it does not own (the X-ray's ?xray=1)
  // are kept. Not before the task is read: the URL's own pick must survive until it can be applied. And only while the URL
  // is this task's own: a render on the way out (back to another task) must never write this task's address over it.
  useEffect(() => {
    if (!task || location.pathname !== selectionHref(task.id, null)) return;
    const href = keepForeignKeys(withTab(selectionHref(task.id, sel), tab), location.search);
    if (`${location.pathname}${location.search}` !== href) window.history.replaceState(window.history.state, '', href);
  }, [task, sel, tab]);
  useTaskKeys(run, replay.running);

  const onPick = (side: Side, pickId: string) => {
    if (!replay.running) pick(side, pickId);
  };
  const rowsOf = task?.ledger.length ?? 0;
  return (
    <Window
      title="Task"
      subtitle={page ? page.subtitle : '—'}
      toolbar={
        <>
          <VerdictLozenge counts={rows ? verdictCounts(rows) : undefined} value={session.filters.verdict} onChange={(verdict) => applyFilters({ ...session.filters, verdict })} />
          <ClassMenuButton tasks={rows} value={session.filters.cls} onChange={(cls) => applyFilters({ ...session.filters, cls })} />
          <Spacer />
          <ReplayButton running={replay.running} unread={!ledgerRead} disabled={!rowsOf} onClick={replay.start} />
        </>
      }
      sidebar={
        <Reveal order={1} slice="docket">
          {rows && visible ? <Docket tasks={rows} visible={visible} currentId={id} onClear={() => applyFilters(NO_FILTERS)} /> : <DocketPending />}
        </Reveal>
      }
      inspector={
        <Reveal order={5} slice="detail">
          {task ? (
            <TaskInspector task={task} clock={clock} ledgerRead={ledgerRead} sel={sel} open={session.panels} onOpen={(panel, open) => session.setPanels((p) => ({ ...p, [panel]: open }))} />
          ) : (
            <InspectorPending />
          )}
        </Reveal>
      }
      inspectorOpen={session.inspOpen}
      onInspectorOpenChange={session.setInspOpen}
      status={visible && page ? statusLine(visible, clock.ageSec, clock.now) : <StatusPending />}
      help={<TaskLegend />}
      helpTitle="Legend"
    >
      <PaneScroll>
        <div className={styles.tk}>
          <Reveal order={2} slice="detail">
            {task ? <TaskHeader task={task} /> : <HeaderPending />}
          </Reveal>
          <Reveal order={3} slice="detail">
            {task ? <VerdictEquation task={task} sel={sel} rv={replay.rv} onSelect={(c) => onPick('check', c)} /> : detailError ? <DetailUnreadable reason={detailError} /> : <EquationPending />}
          </Reveal>
          <TaskTabs
            tab={tab}
            onTab={setTab}
            aux={{ ledger: !ledgerRead ? <Unread label="ledger rows not read yet" /> : replay.row !== null ? `#${task?.ledger[replay.row]?.seq ?? ''}` : rowsOf }}
          >
            <Reveal order={4} slice={tab === 'ledger' ? 'ledger' : 'detail'}>
              {!task ? (
                tab === 'ledger' ? <LedgerPending /> : <PanePending />
              ) : tab === 'chain' ? (
                <ReceiptChain task={task} lit={litLink(task, sel)} />
              ) : tab === 'ledger' ? (
                ledgerRead ? <LedgerPanel task={task} row={replay.row} /> : <LedgerPending />
              ) : (
                <Court task={task} sel={sel} rv={replay.rv} onPick={onPick} />
              )}
            </Reveal>
          </TaskTabs>
        </div>
      </PaneScroll>
    </Window>
  );
}
