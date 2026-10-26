'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { px, range } from '@/components/table/model/columns';
import { BandTable, type BandColumn } from './components/BandTable';
import { agoWords } from './model/format';
import type { ProjectSummary } from './model/types';
import styles from './vitals.module.css';

const COLUMNS = [range(160, 240), range(200, 360), range(200, 300), range(170, 240), range(170, 260), px(120), px(90)].join(' ');
const HEAD: readonly BandColumn[] = [
  { head: 'Project' },
  { head: 'Root', tip: 'The git toplevel the project was onboarded from' },
  { head: 'Host' },
  { head: 'CI' },
  { head: 'Cloud' },
  { head: 'Last collected', tip: 'The newest fetch among the stored CI runs' },
  { head: 'Runs stored', align: 'end' },
];

/** No real project yet: what Vitals is for and the one thing to do, onboard one. */
export function VitalsEmpty() {
  return (
    <div className={styles.empty}>
      <h2>No real project yet</h2>
      <p>
        Vitals measures a real production app: its CI stage times per variant, its production signals and every adjustment an agent claims. Pick a repo you already
        work in with Claude Code; Afterlife proposes what to watch and saves only what its probes confirm.
      </p>
      <Button variant="primary" href="/start">
        Onboard a project
      </Button>
    </div>
  );
}

/** /vitals: the real projects Afterlife watches, from .belay/projects. Enter or a double-click opens one. */
export function VitalsListScreen({ projects, now }: { projects: readonly ProjectSummary[]; now: string }) {
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(projects[0]?.slug ?? null);
  const empty = projects.length === 0;
  return (
    <Window
      title="Vitals"
      subtitle={empty ? 'no real project yet' : `${projects.length} real project${projects.length === 1 ? '' : 's'}`}
      realData
      status={empty ? 'Onboard a project to start measuring it' : 'Enter or double-click a project to open its vitals'}
    >
      <PaneScroll>
        {empty ? (
          <VitalsEmpty />
        ) : (
          <div className={styles.bands}>
            <BandTable
              label="Real projects"
              columns={COLUMNS}
              min={1000}
              head={HEAD}
              selected={sel}
              onSelect={setSel}
              onActivate={(slug) => router.push(`/vitals/${encodeURIComponent(slug)}`)}
              rows={projects.map((p) => ({
                id: p.slug,
                title: p.slug,
                cells: [
                  <Link key="n" href={`/vitals/${encodeURIComponent(p.slug)}`}>{p.name}</Link>,
                  <span key="r" className={styles.mono} title={p.root}>{p.root}</span>,
                  p.host,
                  p.ci,
                  p.cloud,
                  p.lastCollected ? agoWords(p.lastCollected, now) : <HonestyChip key="c" kind="unknown" meaning="Nothing collected yet">never</HonestyChip>,
                  p.runsStored,
                ],
              }))}
            />
          </div>
        )}
      </PaneScroll>
    </Window>
  );
}
