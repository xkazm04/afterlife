'use client';

import { flushSync } from 'react-dom';
import { useHostNav } from '@/components/shell/host';
import { taskHref } from '../components/docket/taskHref';
import { arrowSelection, type Selection } from '../model/court/selection';
import { idAfterFilter, stepTask, toggleFailOnly, visibleTasks, type Filters } from '../model/docket/filters';
import type { TaskAction } from '../model/docket/keys';
import type { DocketRow } from '../model/docket/row';
import type { TaskTab } from '../model/tab';
import type { TaskView } from '../model/types';
import { nextReason, selectionHref } from '../model/verdict/reasons';
import { cardSelector } from './useTieGeometry';
import type { TaskSessionApi } from './TaskSession';

interface Deps {
  id: string;
  /** The open task, once read; the keys that act on it wait for it. */
  task?: TaskView;
  rows?: readonly DocketRow[];
  session: TaskSessionApi;
  sel: Selection;
  set: (s: Selection) => void;
  clear: () => void;
  tab: TaskTab;
  setTab: (t: TaskTab) => void;
  replay: { start: () => void };
}

/** A check card is a container whose select button takes the focus; a claim card or a docket link is focused itself. */
const focus = (selector: string) => {
  const el = document.querySelector<HTMLElement>(selector);
  (el?.querySelector<HTMLElement>('button[aria-pressed]') ?? el)?.focus();
};

/**
 * What the Task screen's keys and filters do. Another task opens through the screen host (`replace`: the docket is a
 * place, not a history of every step), so the session keeps the filters and the inspector across tasks.
 */
export function useTaskActions(d: Deps) {
  const nav = useHostNav();
  const { session } = d;
  const visible = d.rows ? visibleTasks(d.rows, session.filters) : undefined;

  const applyFilters = (next: Filters) => {
    session.setFilters(next);
    const to = d.rows ? idAfterFilter(visibleTasks(d.rows, next), d.id) : null;
    if (to) nav.replace(taskHref(to));
  };
  /** The cards live on the Court: a key that selects one opens it first, flushed so the card is mounted to be focused. */
  const toCourt = () => {
    if (d.tab !== 'court') flushSync(() => d.setTab('court'));
  };

  const run = (a: TaskAction) => {
    if (a.type === 'step') {
      const to = visible ? stepTask(visible, d.id, a.delta) : null;
      if (!to) return;
      const fromDocket = !!document.activeElement?.closest('[data-docket]');
      nav.replace(taskHref(to));
      if (fromDocket) requestAnimationFrame(() => focus(`[data-docket] a[href="${taskHref(to)}"]`));
    } else if (a.type === 'replay') d.replay.start();
    else if (a.type === 'words') {
      session.setInspOpen(true);
      session.setPanels((p) => ({ ...p, words: !p.words }));
    } else if (a.type === 'failOnly') applyFilters(toggleFailOnly(session.filters));
    else if (a.type === 'escape') d.clear();
    else if (!d.task || !visible) return;
    else if (a.type === 'reason') {
      const next = nextReason(visible, d.task, d.sel);
      if (!next) return;
      if (next.id !== d.task.id) return nav.replace(selectionHref(next.id, next.sel));
      if (next.sel) toCourt();
      d.set(next.sel);
      if (next.sel) focus(cardSelector(next.sel.side, next.sel.id));
    } else {
      const next = arrowSelection(d.task, d.sel, a.key);
      if (next) toCourt();
      d.set(next);
      if (next) focus(cardSelector(next.side, next.id));
    }
  };

  return { visible, applyFilters, run };
}
