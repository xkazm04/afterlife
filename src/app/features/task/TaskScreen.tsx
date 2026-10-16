'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { ReceiptChain } from './components/chain/ReceiptChain';
import { Court } from './components/court/Court';
import { Docket } from './components/docket/Docket';
import { VerdictEquation } from './components/equation/VerdictEquation';
import { TaskHeader } from './components/header/TaskHeader';
import { TaskLegend } from './components/help/TaskLegend';
import { TaskInspector, type Panel } from './components/inspector/TaskInspector';
import { ClassMenuButton } from './components/toolbar/ClassMenuButton';
import { ReplayButton } from './components/toolbar/ReplayButton';
import { VerdictLozenge } from './components/toolbar/VerdictLozenge';
import { usePageClock } from './hooks/usePageClock';
import { useReplay } from './hooks/useReplay';
import { useSelection } from './hooks/useSelection';
import { useTaskKeys } from './hooks/useTaskKeys';
import { arrowSelection, litLink, type Selection, type Side } from './model/court/selection';
import { NO_FILTERS, idAfterFilter, statusLine, stepTask, toggleFailOnly, verdictCounts, visibleTasks, type Filters } from './model/docket/filters';
import type { TaskAction } from './model/docket/keys';
import type { PageFacts } from './model/build/loadPage';
import type { TaskView } from './model/types';
import { nextReason, selectionHref } from './model/verdict/reasons';
import styles from './TaskScreen.module.css';

/**
 * /task/[id]: one task's proof, cross-examined. The verdict equation, the receipt chain and the claims-against-checks
 * court sit in the pane; everything about the selection lives in the inspector; the docket is in the sidebar.
 * This screen reads only: nothing on it writes. It opens on `initial` (the URL's ?check= / ?claim=, else the verdict's first
 * deciding check) and keeps the selection in the URL, so a reason has an address.
 */
export function TaskScreen({ tasks, task, page, initial }: { tasks: readonly TaskView[]; task: TaskView; page: PageFacts; initial: Selection }) {
  const router = useRouter();
  const clock = usePageClock(page);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [inspOpen, setInspOpen] = useState(true);
  const [panels, setPanels] = useState<Record<Panel, boolean>>({ words: false, trace: false, ledger: true });
  const { sel, pick, set, clear } = useSelection(task.id, initial);
  const replay = useReplay(task, {
    onStart: () => {
      clear();
      setPanels((p) => ({ ...p, ledger: true }));
    },
  });
  const visible = visibleTasks(tasks, filters);
  // The selection is the address: replaceState keeps useSearchParams in step without a server render.
  useEffect(() => {
    const href = selectionHref(task.id, sel);
    if (`${location.pathname}${location.search}` !== href) window.history.replaceState(null, '', href);
  }, [task.id, sel]);

  const applyFilters = (next: Filters) => {
    setFilters(next);
    const id = idAfterFilter(visibleTasks(tasks, next), task.id);
    if (id) router.replace(`/task/${id}`);
  };
  const onPick = (side: Side, id: string) => {
    if (!replay.running) pick(side, id);
  };
  const focus = (selector: string) => document.querySelector<HTMLElement>(selector)?.focus();

  const run = (a: TaskAction) => {
    if (a.type === 'step') {
      const id = stepTask(visible, task.id, a.delta);
      if (!id) return;
      const fromDocket = !!document.activeElement?.closest('[data-docket]');
      router.replace(`/task/${id}`);
      if (fromDocket) requestAnimationFrame(() => focus(`[data-docket] a[href="/task/${id}"]`));
    } else if (a.type === 'replay') replay.start();
    else if (a.type === 'words') {
      setInspOpen(true);
      setPanels((p) => ({ ...p, words: !p.words }));
    } else if (a.type === 'failOnly') applyFilters(toggleFailOnly(filters));
    else if (a.type === 'escape') clear();
    else if (a.type === 'reason') {
      const next = nextReason(visible, task.id, sel);
      if (!next) return;
      if (next.id !== task.id) return router.replace(selectionHref(next.id, next.sel));
      set(next.sel);
      if (next.sel) focus(`[data-${next.sel.side}-card="${next.sel.id}"]`);
    } else {
      const next = arrowSelection(task, sel, a.key);
      set(next);
      if (next) focus(`[data-${next.side}-card="${next.id}"]`);
    }
  };
  useTaskKeys(run, replay.running);

  return (
    <Window
      title="Task"
      subtitle={page.subtitle}
      toolbar={
        <>
          <VerdictLozenge counts={verdictCounts(tasks)} value={filters.verdict} onChange={(verdict) => applyFilters({ ...filters, verdict })} />
          <ClassMenuButton tasks={tasks} value={filters.cls} onChange={(cls) => applyFilters({ ...filters, cls })} />
          <Spacer />
          <ReplayButton running={replay.running} disabled={!task.ledger.length} onClick={replay.start} />
        </>
      }
      sidebar={<Docket tasks={tasks} visible={visible} currentId={task.id} onClear={() => applyFilters(NO_FILTERS)} />}
      inspector={<TaskInspector task={task} clock={clock} sel={sel} row={replay.row} open={panels} onOpen={(panel, open) => setPanels((p) => ({ ...p, [panel]: open }))} />}
      inspectorOpen={inspOpen}
      onInspectorOpenChange={setInspOpen}
      status={statusLine(visible, clock.ageSec, clock.now)}
      help={<TaskLegend />}
      helpTitle="Legend"
    >
      <PaneScroll>
        <div className={styles.tk}>
          <TaskHeader task={task} />
          <VerdictEquation task={task} sel={sel} rv={replay.rv} onSelect={(id) => onPick('check', id)} />
          <ReceiptChain task={task} lit={litLink(task, sel)} />
          <Court task={task} sel={sel} rv={replay.rv} onPick={onPick} />
        </div>
      </PaneScroll>
    </Window>
  );
}
