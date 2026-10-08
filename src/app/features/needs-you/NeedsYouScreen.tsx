'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { Window } from '@/components/shell/Window';
import { outcomeText, wentThrough } from '@/components/write/outcome';
import { useServerWrites } from '@/components/write/useServerWrites';
import type { ActionIntent } from '@/server/actions/types';
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
 * screen; every write is staged in the outbox first, with its exact command and diff, and runs only on Run. A staged
 * write is planned on the server (the outbox shows the server's commands) and Run confirms exactly that plan.
 */
export function NeedsYouScreen({ demo, intents = {} }: { demo: NeedsYouDemo; intents?: Readonly<Record<string, ActionIntent | null>> }) {
  const { s, dispatch: dispatchRaw } = useNeedsYou(demo);
  const { status } = useToast();
  const writes = useServerWrites(Object.fromEntries(s.out.map((o) => [o.key, intents[o.key] ?? null])));
  /** Run a staged write: the server's plan if it has one (decided only if it went through), else the screen's own. */
  const run = async (key: string) => {
    if (!intents[key]) return dispatchRaw({ type: 'run', key });
    const r = await writes.confirm(key);
    if (wentThrough(r)) dispatchRaw({ type: 'run', key });
    status(outcomeText(r));
  };
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
        <OutboxDrawer s={s} dispatch={dispatch} writes={writes.entries} onRun={(key) => void run(key)} />
      </div>
      {menus.menu}
    </Window>
  );
}
