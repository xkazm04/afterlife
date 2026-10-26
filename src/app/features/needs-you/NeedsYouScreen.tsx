'use client';

import { useRef } from 'react';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Reveal, Unread, useHostNav } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import { RunnerPending, useRunnerStrip } from './components/runner/RunnerStrip';
import { plural } from '@/lib/format/plural';
import { LEDGER_READ_AT, PROJECT_REPO } from './data/constants';
import type { NeedsYouDemo } from './data/types';
import { CraBand, CraBandPending } from './components/band/CraBand';
import { NeedsLegend } from './components/chrome/NeedsLegend';
import { NeedsSidebar } from './components/chrome/NeedsSidebar';
import { NeedsToolbar } from './components/chrome/NeedsToolbar';
import { OutboxDrawer } from './components/outbox/OutboxDrawer';
import { StaleRegion } from './components/shared/StaleRegion';
import { DeskTable } from './components/table/DeskTable';
import { useNeedsStore } from './hooks/NeedsStore';
import { useReveal } from './hooks/useReveal';
import { ON_A_CLOCK } from './model/rows/grouping';
import { decisionCounts, isDecisionId } from './model/rows/rowState';
import type { Action } from './model/types';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import type { TierKey } from '@/lib/demo/types';
import styles from './NeedsYouScreen.module.css';

/** The legend before the desk is read: each tier's meaning a dash. */
const DASH_MEANS = Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, '—'])) as Record<TierKey, string>;

/**
 * Needs you: every decision that waits for a person, and nothing else. The CRA clock is the loudest thing on the
 * screen; every write is staged in the outbox first, with its exact command and diff, and runs only on Run.
 * On the screen host the desk is the session's (NeedsStore); `demo` null: not read yet, the window paints with dashes;
 * `runner` null: the cycle runner's line is not read yet (its slot is held). `stale`: the rows are the last visit's
 * (when they were read), re-reading: each region says so and cannot be acted on until fresh.
 */
export function NeedsYouScreen({ demo, runner = [], stale = null }: { demo: NeedsYouDemo | null; runner?: readonly RunnerNeed[] | null; stale?: string | null }) {
  const { s, dispatch: dispatchRaw } = useNeedsStore();
  const { navigate } = useHostNav();
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // A decision opens its page; a group or ledger row only takes the selection.
  const open = (id: string) => {
    if (isDecisionId(id)) navigate(`/needs-you/${id}`);
  };
  // Reading a draft or a note happens on the decision's page.
  const dispatch = (a: Action) => {
    dispatchRaw(a);
    if (a.type === 'act' && (a.action === 'read-draft' || a.action === 'read-note')) open(a.action === 'read-draft' ? 'n2' : 'n4');
  };
  const counts = decisionCounts(s);
  const runnerUi = useRunnerStrip(runner ?? []);
  useReveal(s.reveal);

  return (
    <Window
      title="Needs you"
      subtitle={PROJECT_REPO.replace('/', ' / ')}
      toolbar={<NeedsToolbar s={s} dispatch={dispatch} searchRef={searchRef} />}
      sidebar={
        <Reveal order={1} slice="view">
          {demo ? <NeedsSidebar s={s} dispatch={dispatch} /> : null}
        </Reveal>
      }
      status={
        demo ? (
          `${plural(counts.all, 'decision')} · ${counts.waiting} waiting · ${ON_A_CLOCK} on a clock · ${s.out.length} in outbox · ledger read ${LEDGER_READ_AT}`
        ) : (
          <>
            <Unread label="decisions not read yet" /> decisions · <Unread label="waiting not read yet" /> waiting · {s.out.length} in outbox
          </>
        )
      }
      help={<NeedsLegend tierMeans={demo?.tierMeans ?? DASH_MEANS} />}
    >
      <div className={styles.content}>
        <div className={styles.page}>
          <PaneScroll padded={false}>
            <Reveal order={2} slice="desk">
              {runner === null ? <RunnerPending /> : runnerUi.strip}
            </Reveal>
            <StaleRegion asOf={stale} label="The CRA clock">
              <Reveal order={2} slice="view">
                {demo ? <CraBand s={s} linksResolved={demo.signoff.linksResolved} dispatch={dispatch} /> : <CraBandPending />}
              </Reveal>
            </StaleRegion>
            <StaleRegion asOf={stale} label="The decisions" className={styles.tw}>
              <Reveal order={3} slice="view">
                {demo ? <DeskTable s={s} demo={demo} dispatch={dispatch} tableRef={tableRef} searchRef={searchRef} open={open} /> : <div className={styles.unread} aria-busy="true" aria-label="Decisions not read yet" />}
              </Reveal>
            </StaleRegion>
          </PaneScroll>
        </div>
        <StaleRegion asOf={stale} label="The outbox">
          <OutboxDrawer s={s} dispatch={dispatch} />
        </StaleRegion>
        {runnerUi.sheet}
      </div>
    </Window>
  );
}
