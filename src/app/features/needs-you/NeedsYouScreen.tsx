'use client';

import { useEffect, useRef, useState } from 'react';
import { Window } from '@/components/shell/Window';
import { plural } from '@/lib/format/plural';
import { LEDGER_READ_AT, PROJECT_REPO } from './data/constants';
import { CRA } from './data/cra';
import type { NeedsYouDemo } from './data/types';
import { CraBand } from './components/band/CraBand';
import { NeedsLegend } from './components/chrome/NeedsLegend';
import { NeedsSidebar } from './components/chrome/NeedsSidebar';
import { NeedsToolbar } from './components/chrome/NeedsToolbar';
import { NeedsInspector } from './components/inspector/NeedsInspector';
import { OutboxDrawer } from './components/outbox/OutboxDrawer';
import { DecisionsTable } from './components/table/DecisionsTable';
import { useElapsed } from './hooks/useElapsed';
import { useNeedsKeys } from './hooks/useNeedsKeys';
import { useNeedsMenus } from './hooks/useNeedsMenus';
import { useNeedsYou } from './hooks/useNeedsYou';
import { secondsLeft } from './model/clock/clock';
import { visibleGroups } from './model/rows/grouping';
import { decisionCounts } from './model/rows/rowState';
import type { Action } from './model/types';
import styles from './NeedsYouScreen.module.css';

/**
 * Needs you: every decision that waits for a person, and nothing else. The CRA clock is the loudest thing on the
 * screen; every write is staged in the outbox first, with its exact command and diff, and runs only on Run.
 */
export function NeedsYouScreen({ demo }: { demo: NeedsYouDemo }) {
  const { s, dispatch: dispatchRaw } = useNeedsYou(demo);
  const leftSec = secondsLeft(CRA.remainingSec, useElapsed());
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Reading a draft or a note opens the inspector on it (the effect below scrolls to the section).
  const dispatch = (a: Action) => {
    if (a.type === 'act' && (a.action === 'read-draft' || a.action === 'read-note')) setInspectorOpen(true);
    dispatchRaw(a);
  };
  const groups = visibleGroups(s, demo);
  const menus = useNeedsMenus(s, demo, dispatch, () => setInspectorOpen(true));
  const onKeyDown = useNeedsKeys({ s, groups, dispatch, tableRef, searchRef, inspectorOpen, setInspectorOpen, onMenuKey: menus.onMenuKey });
  const counts = decisionCounts(s);

  useEffect(() => tableRef.current?.focus({ preventScroll: true }), []);
  // "Read the draft" opens the inspector on its section and scrolls to it, once per request.
  const reveal = s.reveal;
  useEffect(() => {
    if (!reveal) return;
    const frame = requestAnimationFrame(() => document.getElementById(`insp-${reveal.key}`)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [reveal]);

  return (
    <Window
      title="Needs you"
      subtitle={PROJECT_REPO.replace('/', ' / ')}
      toolbar={<NeedsToolbar s={s} dispatch={dispatch} searchRef={searchRef} />}
      sidebar={<NeedsSidebar s={s} dispatch={dispatch} />}
      inspector={<NeedsInspector s={s} demo={demo} leftSec={leftSec} dispatch={dispatch} />}
      inspectorOpen={inspectorOpen}
      onInspectorOpenChange={setInspectorOpen}
      status={`${plural(counts.all, 'decision')} · ${counts.waiting} waiting · 1 on a clock · ${s.out.length} in outbox · ledger read ${LEDGER_READ_AT}`}
      help={<NeedsLegend tierMeans={demo.tierMeans} />}
    >
      <div className={styles.content}>
        <CraBand s={s} leftSec={leftSec} linksResolved={demo.signoff.linksResolved} dispatch={dispatch} />
        <div className={styles.tw}>
          <DecisionsTable
            s={s}
            demo={demo}
            groups={groups}
            leftSec={leftSec}
            menuing={menus.isOpen}
            tableRef={tableRef}
            onKeyDown={onKeyDown}
            dispatch={dispatch}
            onActivate={() => setInspectorOpen(true)}
            onRowMenu={menus.onRowMenu}
            onGroupMenu={menus.onGroupMenu}
          />
        </div>
        <OutboxDrawer s={s} dispatch={dispatch} />
      </div>
      {menus.menu}
    </Window>
  );
}
