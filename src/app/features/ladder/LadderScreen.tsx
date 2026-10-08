'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { Window } from '@/components/shell/Window';
import { pluralWord } from '@/lib/format/plural';
import { LadderToolbar } from './components/chrome/LadderToolbar';
import { PolicyLozenge } from './components/chrome/PolicyLozenge';
import { Dock } from './components/dock/Dock';
import { HelpContent } from './components/help/HelpContent';
import { PolicyContent } from './components/help/PolicyContent';
import { LadderInspector } from './components/inspector/LadderInspector';
import type { SectionState } from './components/inspector/Sec';
import { LadderSidebar } from './components/sidebar/LadderSidebar';
import { ClassTable } from './components/table/ClassTable';
import { useLadderActions } from './hooks/useLadderActions';
import { useLadderData } from './hooks/useLadderData';
import { useLadderKeys } from './hooks/useLadderKeys';
import { useLadderMenus } from './hooks/useLadderMenus';
import { useLadderPopovers } from './hooks/useLadderPopovers';
import { useRevokeWrite } from './hooks/useRevokeWrite';
import { useSimClock } from './hooks/useSimClock';
import { livePollAge, pollAge } from './model/clock';
import { DemoChip } from './components/chrome/DemoChip';
import { TiersStale } from './components/chrome/TiersStale';
import { dockModel } from './model/rules/dock';
import type { Tier } from './model/types';
import type { LadderScreenProps } from './props';
import { filterCount } from './model/view/filters';
import styles from './LadderScreen.module.css';

export type { LadderScreenProps } from './props';

/** The Ladder: every action class, its tier and ceiling, the record behind it, and what you can revoke or promote. */
export function LadderScreen({ project, seed, tracks: trackList, means, policy, tiersStale, illustrative, live, feedAgeSec, subtitle }: LadderScreenProps) {
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
  const writes = useRevokeWrite(project, data.selected, shownTo);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [open, setOpenMap] = useState<Readonly<Record<string, boolean>>>({});
  const clock = useSimClock(live);
  const pop = useLadderPopovers();

  const sections: SectionState = useMemo(
    () => ({ isOpen: (key, fallback) => open[key] ?? fallback, setOpen: (key, o) => setOpenMap((m) => (m[key] === o ? m : { ...m, [key]: o })) }),
    [open],
  );

  // Enter / double-click: show the promotion rule and the write in the inspector.
  const openDetail = useCallback(
    (id?: string) => {
      const target = id ?? data.sel;
      if (!target || target.startsWith('g:')) return;
      setOpenMap((m) => ({ ...m, rule: true, write: true }));
      setInspectorOpen(true);
      requestAnimationFrame(() => document.getElementById('ladder-rule')?.scrollIntoView({ block: 'start' }));
    },
    [data.sel],
  );

  const resetUi = useCallback(() => {
    pop.close();
    setHoverTo(null);
    setPinned(null);
  }, [pop]);
  const onShow = useCallback((id: string, to: Tier) => setPinned({ id, to }), []);
  const actions = useLadderActions({ project, live, data, writes, stamp: clock.stamp, seed, tableRef, openDetail, onReset: resetUi, onShow });
  const menus = useLadderMenus({ data, actions, writes, onHover: setHoverTo });

  const toggleHelp = () => {
    const anchor = helpRef.current;
    if (anchor) pop.toggle('help', anchor, <HelpContent means={means} onReset={actions.reset} />, 'above');
  };
  const togglePolicy = () => {
    const anchor = policyRef.current;
    if (anchor) pop.toggle('policy', anchor, <PolicyContent head={state.head} rules={policy} history={illustrative.history} />, 'below');
  };
  useLadderKeys({ data, actions, searchRef, enabled: !menus.isOpen, toggleHelp, closeInspector: () => setInspectorOpen(false) });

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
  useEffect(() => tableRef.current?.focus({ preventScroll: true }), []);

  const onSearchKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    actions.focusTable();
  };

  const total = state.classes.length;
  const shown = data.visible.length;
  const filters = filterCount({ src: state.src, filt: state.filt, q: state.q });
  const age = live ? livePollAge(clock.elapsed, feedAgeSec) : pollAge(clock.elapsed, feedAgeSec);

  return (
    <Window
      title="Ladder"
      subtitle={subtitle}
      toolbar={
        <LadderToolbar
          counts={data.counts}
          total={total}
          filt={state.filt}
          onFilter={actions.setFilter}
          lozenge={<PolicyLozenge head={state.head} history={illustrative.history} onOpen={togglePolicy} anchorRef={policyRef} />}
          sort={state.sort}
          onSortMenu={menus.openSort}
          q={state.q}
          onQuery={(q) => dispatch({ type: 'query', q })}
          searchRef={searchRef}
          onSearchKey={onSearchKey}
        />
      }
      sidebar={<LadderSidebar classes={state.classes} tracks={tracks} trackIds={data.trackIds} src={state.src} policy={policy} onSource={actions.setSource} />}
      inspector={
        <LadderInspector
          sel={data.sel}
          classes={state.classes}
          byId={byId}
          tracks={tracks}
          ledger={state.ledger}
          promotionOf={data.promotionOf}
          sections={sections}
          writeTo={shownTo}
          viewOf={writes.viewOf}
          onRevoke={actions.revoke}
          onTargets={menus.openTargets}
          onPromote={actions.promote}
        />
      }
      inspectorOpen={inspectorOpen}
      onInspectorOpenChange={setInspectorOpen}
      status={
        <>
          {shown === total ? total : `${shown} of ${total}`} classes · {filters} {pluralWord(filters, 'filter')} · tier-state.yml @ {state.head.sha} <DemoChip on={!!state.head.demo} what="The tier-state.yml head" />
          <TiersStale stale={tiersStale} /> · polled {age} s ago
        </>
      }
    >
      <div className={styles.host}>
        <ClassTable
          groups={data.view.groups}
          grouped={state.grouped}
          tracks={tracks}
          sort={state.sort}
          onSort={(key) => dispatch({ type: 'sort', key })}
          sel={data.sel}
          just={state.just}
          promotionOf={data.promotionOf}
          empty={shown === 0}
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
      </div>
      <Dock model={dockModel(data.sel, byId, tracks, shownTo, writes.viewOf)} onHelp={toggleHelp} helpRef={helpRef} />
      {menus.menus}
      {pop.popover}
    </Window>
  );
}
