'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal, useHostNav } from '@/components/shell/host';
import { isGroupNavId } from '@/components/table/model/rowNavigation';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { Window } from '@/components/shell/Window';
import { LadderToolbar } from './components/chrome/LadderToolbar';
import { PolicyLozenge } from './components/chrome/PolicyLozenge';
import { Dock } from './components/dock/Dock';
import { HelpContent } from './components/help/HelpContent';
import { PolicyContent, PolicyHeadProvider } from './components/help/PolicyContent';
import { LadderSidebar } from './components/sidebar/LadderSidebar';
import { ClassTable } from './components/table/ClassTable';
import { useLadderActions } from './hooks/useLadderActions';
import { useLadderData } from './hooks/useLadderData';
import { useLadderKeys } from './hooks/useLadderKeys';
import { useLadderMenus } from './hooks/useLadderMenus';
import { useLadderPopovers } from './hooks/useLadderPopovers';
import { usePromoteWrite } from './hooks/usePromoteWrite';
import { useReceipts } from './hooks/useReceipts';
import { useRevokeWrite } from './hooks/useRevokeWrite';
import { useSimClock } from './hooks/useSimClock';
import { LadderStatus } from './components/chrome/LadderStatus';
import { dockModel, type DockModel } from './model/rules/dock';
import { promoteAsk } from './model/rules/promote';
import type { Tier } from './model/types';
import type { LadderScreenProps } from './props';
import { filterCount } from './model/view/filters';
import styles from './LadderScreen.module.css';

export type { LadderScreenProps } from './props';

/** What the screen host has not read yet: the classes (`core`) and the moves (`ledger`, which the opening order needs). */
export interface LadderUnread {
  core: boolean;
  ledger: boolean;
}

/**
 * The Ladder: every action class, its tier and ceiling, the record behind it, and what you can revoke or promote. On the
 * screen host its state is the session's (screen/session.tsx); `unread` paints the same window with dashes, and the rows
 * wait for both reads so they never re-order under the eye; `coreError` says why the classes could not be read.
 */
export function LadderScreen({ project, seed, tracks: trackList, means, policy, tiersStale, illustrative, live, feedAgeSec, subtitle, unread, coreError }: LadderScreenProps & { unread?: LadderUnread; coreError?: string }) {
  const data = useLadderData(seed, trackList, policy);
  const { state, dispatch, byId, tracks } = data;
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLButtonElement>(null);
  const policyRef = useRef<HTMLDivElement>(null);
  const [hoverTo, setHoverTo] = useState<Tier | null>(null);
  // A target r cannot send yet (q, an unhovered menu item): its write is put on screen first, until the selection moves.
  const [pinned, setPinned] = useState<{ id: string; to: Tier } | null>(null);
  const shownTo = hoverTo ?? (pinned && pinned.id === data.sel ? pinned.to : null);
  const writes = useRevokeWrite(project, data.selected, shownTo, data);
  // The selected class's promotion (eligible, or a quarantine's re-admission) is asked for; p or Promote puts it on the dock.
  const [promoting, setPromoting] = useState<string | null>(null);
  const promoteWant = data.selected ? promoteAsk(data.selected, data.promotionOf(data.selected)) : null;
  const promos = usePromoteWrite(project, promoteWant);
  const dock = dockModel(data.sel, byId, tracks, shownTo, writes.viewOf, { want: promoteWant, pinned: promoting === data.sel, viewOf: promos.viewOf }, writes.trackViewOf, writes.trackWant);
  const dockRef = useRef<DockModel>(dock);
  useEffect(() => {
    dockRef.current = dock;
  });
  const clock = useSimClock(live);
  const pop = useLadderPopovers();
  const { navigate } = useHostNav();
  const coreUnread = !!unread?.core;
  const rowsUnread = coreUnread || !!unread?.ledger;

  // Enter / double-click: open the class's own page (the promotion rule and the write). A group row has none.
  const openDetail = useCallback(
    (id?: string) => {
      const target = id ?? data.sel;
      if (!target || isGroupNavId(target)) return;
      navigate(`/ladder/${encodeURIComponent(target)}`);
    },
    [data.sel, navigate],
  );

  const resetUi = useCallback(() => {
    pop.close();
    setHoverTo(null);
    setPinned(null);
    setPromoting(null);
  }, [pop]);
  const onShow = useCallback((id: string, to: Tier) => {
    setPinned({ id, to });
    setPromoting(null);
  }, []);
  // The dock shows one write: p sends the promotion only while it is the one shown, r the revoke only while it is.
  const onDock = useCallback((id: string) => dockRef.current.kind === 'promote' && dockRef.current.id === id, []);
  const promoteScreen = useMemo(() => {
    const show = (id: string) => {
      setPinned(null);
      setPromoting(id);
    };
    return { shown: onDock, show };
  }, [onDock]);
  const revokeShown = useCallback((id: string) => !onDock(id), [onDock]);
  const actions = useLadderActions({ project, data, writes, promos, promoteScreen, revokeShown, stamp: clock.stamp, seed, tableRef, openDetail, onReset: resetUi, onShow });
  const menus = useLadderMenus({ data, actions, writes, onHover: setHoverTo });
  useReceipts(live, seed, state.classes.some((c) => c.pending), dispatch);

  const toggleHelp = () => {
    const anchor = helpRef.current;
    if (anchor) pop.toggle('help', anchor, <HelpContent means={means} onReset={live ? undefined : actions.reset} />, 'above');
  };
  const togglePolicy = () => {
    const anchor = policyRef.current;
    if (anchor) pop.toggle('policy', anchor, <PolicyContent rules={policy} history={illustrative.history} />, 'below');
  };
  useLadderKeys({ data, actions, searchRef, enabled: !menus.isOpen, toggleHelp });

  const onKeyDown = useRowNavigation({
    items: data.view.nav,
    selected: data.sel,
    onSelect: actions.select,
    onToggleGroup: (id, o) => dispatch({ type: 'toggleGroup', id, open: o }),
    onActivate: openDetail,
    onContextMenuKey: menus.openForSelection,
    tableRef,
    grouped: state.grouped,
  });
  useEffect(() => tableRef.current?.focus({ preventScroll: true }), [rowsUnread]);

  const onSearchKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    actions.focusTable();
  };

  const total = state.classes.length;
  const shown = data.visible.length;
  const filters = filterCount({ src: state.src, filt: state.filt, q: state.q });

  return (
    <Window
      title="Ladder"
      subtitle={subtitle}
      toolbar={
        <LadderToolbar
          counts={coreUnread ? null : data.counts}
          total={coreUnread ? null : total}
          filt={state.filt}
          onFilter={actions.setFilter}
          lozenge={<PolicyLozenge head={state.head} history={illustrative.history} onOpen={togglePolicy} anchorRef={policyRef} />}
          sort={state.sort}
          onSortMenu={menus.openSort}
          sortOpen={menus.sortOpen}
          q={state.q}
          onQuery={(q) => dispatch({ type: 'query', q })}
          searchRef={searchRef}
          onSearchKey={onSearchKey}
        />
      }
      sidebar={
        <Reveal order={1} slice="core">
          <LadderSidebar classes={state.classes} tracks={tracks} trackIds={data.trackIds} src={state.src} policy={policy} onSource={actions.setSource} unread={coreUnread} />
        </Reveal>
      }
      status={<LadderStatus shown={shown} total={total} filters={filters} unread={coreUnread} head={state.head} stale={tiersStale} live={live} elapsed={clock.elapsed} feedAgeSec={feedAgeSec} />}
    >
      <Reveal order={2} slice="ledger" className={styles.host}>
        {coreError && coreUnread ? <div className={styles.unreadable} role="status">The classes could not be read: {coreError}</div> : null}
        <ClassTable
          groups={rowsUnread ? [] : data.view.groups}
          grouped={state.grouped}
          tracks={tracks}
          sort={state.sort}
          onSort={(key) => dispatch({ type: 'sort', key })}
          sel={data.sel}
          just={state.just}
          promotionOf={data.promotionOf}
          policy={policy}
          empty={shown === 0 && !rowsUnread ? { src: state.src, filt: state.filt, q: state.q } : null}
          live={live}
          menuing={menus.isOpen}
          onSelect={actions.select}
          onToggleGroup={(id) => dispatch({ type: 'toggleGroup', id })}
          onActivate={openDetail}
          onRowMenu={menus.openRowMenu}
          onGroupMenu={menus.openGroupMenu}
          onRevoke={actions.revoke}
          onTargets={menus.openTargets}
          onPromote={actions.promote}
          onKeyDown={onKeyDown}
          tableRef={tableRef}
        />
      </Reveal>
      <Dock model={dock} onHelp={toggleHelp} helpRef={helpRef} />
      {menus.menus}
      <PolicyHeadProvider head={state.head}>{pop.popover}</PolicyHeadProvider>
    </Window>
  );
}
