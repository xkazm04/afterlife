'use client';

import { useState } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Reveal } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { Answer } from './components/answer/Answer';
import { ChangesTable } from './components/changes/ChangesTable';
import { Designer } from './components/designer/Designer';
import { CycleGrid } from './components/grid/CycleGrid';
import { CyclesInspector } from './components/inspector/CyclesInspector';
import { CyclesLegend } from './components/CyclesLegend';
import { CyclesSidebar } from './components/CyclesSidebar';
import { CyclesStatus } from './components/CyclesStatus';
import { AnswerPending, CoreUnreadable, DetailPending, GridPending, InspectorPending, StatusPending } from './components/pending/CyclesPending';
import { ScopeSwitch } from './components/ScopeSwitch';
import { LoopRail } from './components/rail/LoopRail';
import { ReportSheet } from './components/report/ReportSheet';
import { useCycles } from './hooks/useCycles';
import type { CyclesData } from './model/build';
import { STATE_WORD } from './model/words';
import styles from './cycles.module.css';

/**
 * Cycles: improvement as a loop that does not end. Every cycle scans, picks gaps, sends them as you, waits for a
 * person to merge, and closes only when a same-engine rescan credits or rejects each change. The grid replays every
 * stage from day 0; the answer band proves the replay equals the latest scan. Illustrative demo data.
 * The screen host draws it from the core slice (screen/host.tsx): `data` absent, the same window with a dash for every
 * value (`coreError`: why it could not be read); the scope switch, the stage rows and the legend paint at once.
 */
export function CyclesScreen({ data, coreError, startDesign = false }: { data?: CyclesData; coreError?: string; startDesign?: boolean }) {
  const c = useCycles(data, startDesign);
  const sel = c.selected;
  const d = c.design;
  const view = c.view;
  const planned = view?.cycles.find((x) => x.state === 'planned');
  const [report, setReport] = useState<string | null>(null);
  const reported = report ? view?.cycles.find((x) => x.id === report && x.state === 'closed') : undefined;
  return (
    <Window
      title="Cycles"
      subtitle={data ? data.project.replace('/', ' / ') : '— / —'}
      toolbar={
        <>
          <ScopeSwitch scope="project" project={data ? (data.project.split('/').at(-1) ?? data.project) : undefined} />
          <Spacer />
          {planned ? (
            <ToolbarButton pressed={!!d.draft} title={`Design ${planned.id}: pick its changes, the grid previews them`} onClick={d.draft ? d.cancel : d.start}>
              {d.draft ? `Designing ${planned.id}` : `Design ${planned.id}`}
            </ToolbarButton>
          ) : null}
        </>
      }
      sidebar={
        <Reveal order={1} slice="core">
          <CyclesSidebar cycles={view?.cycles ?? []} selected={sel?.id ?? ''} onSelect={c.select} />
        </Reveal>
      }
      inspector={
        <Reveal order={5} slice="core">
          {view && sel ? <CyclesInspector cycle={sel} data={view} designed={d.saved} onDesign={d.start} onReport={() => setReport(sel.id)} /> : <InspectorPending />}
        </Reveal>
      }
      status={view && sel ? <CyclesStatus data={view} selected={sel} /> : <StatusPending />}
      help={<CyclesLegend />}
      helpTitle="Reading the grid"
    >
      {/* The pane listens for the arrow keys that walk the cycles; the column heads are the focusable controls. */}
      <div className={styles.content} onKeyDown={c.onKeyDown}>
        <Reveal order={2} slice="core">
          {data ? <Answer data={data} /> : <AnswerPending />}
        </Reveal>
        <Reveal order={3} slice="core">
          <section className={styles.card} aria-label="Every stage, every cycle" data-scroll-x>
            {c.grid && sel ? <CycleGrid view={c.grid} selected={sel.id} onSelect={c.select} /> : <GridPending />}
          </section>
        </Reveal>
        <Reveal order={4} slice="core">
          {!view || !sel ? (
            coreError ? <CoreUnreadable reason={coreError} /> : <DetailPending />
          ) : d.draft && planned ? (
            <Designer cycleId={planned.id} candidates={d.candidates} picked={d.picks} problems={d.problems} onToggle={d.toggle} onSave={d.save} onCancel={d.cancel} />
          ) : (
            <section className={styles.detail} aria-label={`${sel.id} detail`}>
              <header className={styles.dh}>
                <h2>
                  {sel.id} <span>{sel.theme}</span>
                </h2>
                <span className={styles.state} data-state={sel.state}>
                  {STATE_WORD[sel.state]}
                </span>
              </header>
              <LoopRail cycle={sel} />
              <ChangesTable cycle={sel} />
            </section>
          )}
        </Reveal>
      </div>
      {reported && view ? <ReportSheet cycle={reported} data={view} onClose={() => setReport(null)} /> : null}
    </Window>
  );
}
