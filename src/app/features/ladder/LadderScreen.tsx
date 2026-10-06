'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { SearchField } from '@/components/controls/toolbar/SearchField';
import { useRowNavigation } from '@/components/table/useRowNavigation';
import { Window } from '@/components/shell/Window';
import { pluralWord } from '@/lib/format/plural';
import { PolicyLozenge } from './components/chrome/PolicyLozenge';
import { TierFilter } from './components/chrome/TierFilter';
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
import { useSimClock } from './hooks/useSimClock';
import { pollAge } from './model/clock';
import { dockModel } from './model/rules/dock';
import type { Ceiling, Tier, Track } from './model/types';
import { filterCount } from './model/view/filters';
import { SORT_NAMES } from './model/view/sort';
import type { LadderSeed } from './model/state/state';
import styles from './LadderScreen.module.css';

export interface LadderScreenProps {
  seed: LadderSeed;
  tracks: readonly Track[];
  /** What each tier means, for the legend. */
  means: Readonly<Record<Ceiling, string>>;
  /** How old the last poll was when the demo opened, in seconds. */
  feedAgeSec: number;
  /** "acme-lab / ledgerline". */
  subtitle: string;
}

/** The Ladder: every action class, its tier and ceiling, the record behind it, and what you can revoke or promote. */
export function LadderScreen({ seed, tracks: trackList, means, feedAgeSec, subtitle }: LadderScreenProps) {
  const data = useLadderData(seed, trackList);
  const { state, dispatch, byId, tracks } = data;
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLButtonElement>(null);
  const policyRef = useRef<HTMLDivElement>(null);
  const [hoverTo, setHoverTo] = useState<Tier | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [open, setOpenMap] = useState<Readonly<Record<string, boolean>>>({});
  const clock = useSimClock();
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
  }, [pop]);
  const actions = useLadderActions({ data, stamp: clock.stamp, seed, tableRef, openDetail, onReset: resetUi });
  const menus = useLadderMenus({ data, actions, onHover: setHoverTo });

  const toggleHelp = () => {
    const anchor = helpRef.current;
    if (anchor) pop.toggle('help', anchor, <HelpContent means={means} onReset={actions.reset} />, 'above');
  };
  const togglePolicy = () => {
    const anchor = policyRef.current;
    if (anchor) pop.toggle('policy', anchor, <PolicyContent head={state.head} />, 'below');
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
  const age = pollAge(clock.elapsed, feedAgeSec);

  return (
    <Window
      title="Ladder"
      subtitle={subtitle}
      toolbar={
        <>
          <TierFilter counts={data.counts} total={total} value={state.filt} onChange={actions.setFilter} />
          <Spacer />
          <PolicyLozenge head={state.head} onOpen={togglePolicy} anchorRef={policyRef} />
          <Spacer />
          <PopupButton icon="sort" title="Sort" onClick={(e) => menus.openSort(e.currentTarget)}>
            {SORT_NAMES[state.sort.key]}
          </PopupButton>
          <div className={styles.search} onKeyDown={onSearchKey}>
            <SearchField value={state.q} onChange={(q) => dispatch({ type: 'query', q })} placeholder="Filter classes" label="Filter classes by name" inputRef={searchRef} />
          </div>
        </>
      }
      sidebar={<LadderSidebar classes={state.classes} tracks={tracks} trackIds={data.trackIds} src={state.src} onSource={actions.setSource} />}
      inspector={
        <LadderInspector
          sel={data.sel}
          classes={state.classes}
          byId={byId}
          tracks={tracks}
          ledger={state.ledger}
          promotionOf={data.promotionOf}
          sections={sections}
          onRevoke={actions.revoke}
          onTargets={menus.openTargets}
          onPromote={actions.promote}
        />
      }
      inspectorOpen={inspectorOpen}
      onInspectorOpenChange={setInspectorOpen}
      status={
        <>
          {shown === total ? total : `${shown} of ${total}`} classes · {filters} {pluralWord(filters, 'filter')} · tier-state.yml @ {state.head.sha} · polled {age} s ago
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
      <Dock model={dockModel(data.sel, byId, tracks, hoverTo)} onHelp={toggleHelp} helpRef={helpRef} />
      {menus.menus}
      {pop.popover}
    </Window>
  );
}
