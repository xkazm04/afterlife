'use client';

import { Window } from '@/components/shell/Window';
import { Answer } from './components/answer/Answer';
import { ChangesTable } from './components/changes/ChangesTable';
import { CycleGrid } from './components/grid/CycleGrid';
import { CyclesInspector } from './components/inspector/CyclesInspector';
import { CyclesLegend } from './components/CyclesLegend';
import { CyclesSidebar } from './components/CyclesSidebar';
import { CyclesStatus } from './components/CyclesStatus';
import { LoopRail } from './components/rail/LoopRail';
import { useCycles } from './hooks/useCycles';
import type { CyclesData } from './model/build';
import { STATE_WORD } from './model/words';
import styles from './cycles.module.css';

/**
 * Cycles: improvement as a loop that does not end. Every cycle scans, picks gaps, sends them as you, waits for a
 * person to merge, and closes only when a same-engine rescan credits or rejects each change. The grid replays every
 * stage from day 0; the answer band proves the replay equals the latest scan. Illustrative demo data.
 */
export function CyclesScreen({ data }: { data: CyclesData }) {
  const c = useCycles(data);
  const sel = c.selected;
  return (
    <Window
      title="Cycles"
      subtitle={data.project.replace('/', ' / ')}
      sidebar={<CyclesSidebar cycles={data.cycles} selected={sel.id} onSelect={c.select} />}
      inspector={<CyclesInspector cycle={sel} data={data} />}
      status={<CyclesStatus data={data} selected={sel} />}
      help={<CyclesLegend />}
      helpTitle="Reading the grid"
    >
      {/* The pane listens for the arrow keys that walk the cycles; the column heads are the focusable controls. */}
      <div className={styles.content} onKeyDown={c.onKeyDown}>
        <Answer data={data} />
        <section className={styles.card} aria-label="Every stage, every cycle">
          <CycleGrid view={c.grid} selected={sel.id} onSelect={c.select} />
        </section>
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
      </div>
    </Window>
  );
}
