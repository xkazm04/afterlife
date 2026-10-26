'use client';

import { useCallback, useMemo, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { groupNavId, type NavItem } from '@/components/table/model/rowNavigation';
import { canStage, groupDesk, OUT_EMPTY, outReduce, type DeskGroup, type DeskItem, type Grouping } from '../model/desk';
import type { LiveEvidence } from '../model/evidence/evidence';
import { useLiveActs } from './useLiveActs';

/**
 * The live desk's state: the grouping, which groups are shut, the selection, the outbox (model/desk outReduce) and the
 * writes (useLiveActs: the selected and the staged rows ask for their exact write). Run all confirms each staged row's
 * current preview in staging order, records each answer and goes on past a refused or failed one. The keys are the
 * desk's: arrows move, Left/Right shut and open a group, Space stages or unstages the selected row, Enter focuses the
 * inspector.
 */
/** Every row the keyboard can visit, in order: group rows, then their rows when open. */
export function navOf(groups: readonly DeskGroup[], shut: readonly string[]): NavItem[] {
  return groups.flatMap((g) => {
    const gid = groupNavId(g.id);
    const open = !shut.includes(g.id);
    return [{ id: gid, kind: 'group' as const, expanded: open }, ...(open ? g.items.map((n) => ({ id: n.id, kind: 'row' as const, parent: gid })) : [])];
  });
}

/**
 * `wanted`: the URL's `?item=` as the screen host shows it on this visit (Ladder's p sends one). A new one (another visit
 * with another item) takes the selection over again; the person's own pick holds until then.
 */
export function useLiveDesk(items: readonly DeskItem[], evidence: Readonly<Record<string, LiveEvidence>>, wanted: string | null = null) {
  const [grouping, setGrouping] = useState<Grouping>('kind');
  const groups = useMemo(() => groupDesk(items, grouping), [items, grouping]);
  const [shut, setShut] = useState<readonly string[]>([]);
  const toggleGroup = (id: string, open?: boolean) =>
    setShut((s) => ((open ?? s.includes(id)) ? s.filter((x) => x !== id) : s.includes(id) ? s : [...s, id]));

  // `?item=<id>` opens that row selected (Ladder's p on an eligible class), when it is listed; else the first waiting row
  const [picked, select] = useState<string | null | undefined>(undefined);
  const [seenWanted, setSeenWanted] = useState(wanted);
  if (seenWanted !== wanted) {
    setSeenWanted(wanted);
    if (wanted) select(undefined);
  }
  const first = groups.flatMap((g) => g.items).find((n) => n.kind !== 'decided')?.id ?? null;
  const sel = picked !== undefined ? picked : wanted && items.some((n) => n.id === wanted) ? wanted : first;
  const selected = items.find((n) => n.id === sel) ?? null;

  const [out, outDispatch] = useReducer(outReduce, OUT_EMPTY);
  const inView = useMemo(() => (sel ? [sel, ...out.order] : [...out.order]), [sel, out.order]);
  const acts = useLiveActs(items, inView, evidence);

  const toggleStage = (id: string | null) => {
    const row = items.find((n) => n.id === id);
    if (!row || out.running) return;
    if (out.order.includes(row.id)) outDispatch({ type: 'unstage', id: row.id });
    else if (canStage(row)) outDispatch({ type: 'stage', id: row.id });
  };

  /** Run on one row; a staged row's answer is recorded in the outbox too. */
  const run = (id: string) => {
    const staged = out.order.includes(id);
    void acts.run(id)?.then((r) => staged && outDispatch({ type: 'result', id, ...r }));
  };

  const runningAll = useRef(false);
  const runAll = async () => {
    if (runningAll.current || out.running || !out.order.length) return;
    runningAll.current = true;
    const order = [...out.order];
    outDispatch({ type: 'start' });
    for (const id of order) {
      outDispatch({ type: 'result', id, state: 'running', text: null });
      const r = await acts.confirmNow(id).catch(() => ({ state: 'failed' as const, text: 'The run stopped on an error before an answer came back.' }));
      outDispatch({ type: 'result', id, ...r });
    }
    outDispatch({ type: 'finish' });
    runningAll.current = false;
  };

  const [outboxOpen, setOutboxOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const focusInspector = useCallback(() => {
    setInspectorOpen(true);
    requestAnimationFrame(() => inspectorRef.current?.focus({ preventScroll: true }));
  }, []);

  const nav = useRowNavigation({
    items: navOf(groups, shut),
    selected: sel,
    onSelect: select,
    onToggleGroup: toggleGroup,
    onActivate: focusInspector,
    tableRef,
    grouped: true,
  });
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === ' ' && e.target === e.currentTarget) {
      toggleStage(sel);
      e.preventDefault();
      return;
    }
    nav(e);
  };

  return {
    grouping, setGrouping, groups, shut, toggleGroup, sel, select, selected,
    out, toggleStage, run, runAll, retry: acts.retry,
    views: acts.views, answers: acts.answers, sent: acts.sent, sending: acts.sending,
    outboxOpen, setOutboxOpen, inspectorOpen, setInspectorOpen, tableRef, inspectorRef, focusInspector, onKeyDown,
  };
}

export type LiveDeskState = ReturnType<typeof useLiveDesk>;
