'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Window } from '@/components/shell/Window';
import { plural } from '@/lib/format/plural';
import { LEDGER_READ_AT, PROJECT_REPO } from './data/constants';
import { CRA } from './data/cra';
import type { NeedsYouDemo } from './data/types';
import { CraBand } from './components/band/CraBand';
import { NeedsLegend } from './components/chrome/NeedsLegend';
import { NeedsSidebar } from './components/chrome/NeedsSidebar';
import { NeedsToolbar } from './components/chrome/NeedsToolbar';
import { OutboxDrawer } from './components/outbox/OutboxDrawer';
import { DecisionsTable } from './components/table/DecisionsTable';
import { useElapsed } from './hooks/useElapsed';
import { useNeedsStore } from './hooks/NeedsStore';
import { useNeedsKeys } from './hooks/useNeedsKeys';
import { useNeedsMenus } from './hooks/useNeedsMenus';
import { useReveal } from './hooks/useReveal';
import { secondsLeft } from './model/clock/clock';
import { visibleGroups } from './model/rows/grouping';
import { decisionCounts, isDecisionId } from './model/rows/rowState';
import type { Action } from './model/types';
import styles from './NeedsYouScreen.module.css';

/**
 * Needs you: every decision that waits for a person, and nothing else. The CRA clock is the loudest thing on the
 * screen; every write is staged in the outbox first, with its exact command and diff, and runs only on Run.
 */
export function NeedsYouScreen({ demo }: { demo: NeedsYouDemo }) {
  const { s, dispatch: dispatchRaw } = useNeedsStore();
  const router = useRouter();
  const leftSec = secondsLeft(CRA.remainingSec, useElapsed());
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // A decision opens its page; a group or ledger row only takes the selection.
  const open = (id: string) => {
    if (isDecisionId(id)) router.push(`/needs-you/${id}`);
  };
  // Reading a draft or a note happens on the decision's page.
  const dispatch = (a: Action) => {
    dispatchRaw(a);
    if (a.type === 'act' && (a.action === 'read-draft' || a.action === 'read-note')) open(a.action === 'read-draft' ? 'n2' : 'n4');
  };
  const groups = visibleGroups(s, demo);
  const menus = useNeedsMenus(s, demo, dispatch, open);
  const onKeyDown = useNeedsKeys({ s, groups, dispatch, tableRef, searchRef, onActivate: open, onMenuKey: menus.onMenuKey });
  const counts = decisionCounts(s);

  useEffect(() => tableRef.current?.focus({ preventScroll: true }), []);
  useReveal(s.reveal);

  return (
    <Window
      title="Needs you"
      subtitle={PROJECT_REPO.replace('/', ' / ')}
      toolbar={<NeedsToolbar s={s} dispatch={dispatch} searchRef={searchRef} />}
      sidebar={<NeedsSidebar s={s} dispatch={dispatch} />}
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
            onActivate={open}
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
