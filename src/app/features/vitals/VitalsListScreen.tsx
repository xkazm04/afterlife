'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Reveal, Unread, useHostNav } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { px, range } from '@/components/table/model/columns';
import { BandTable, type BandColumn } from './components/BandTable';
import { Unreadable } from './components/states/Unreadable';
import { agoWords } from './model/format';
import type { ListRow } from './model/slices';
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
      <Button variant="primary" href="/onboard">
        Onboard a project
      </Button>
    </div>
  );
}

const lastCell = (p: ListRow, now: string | undefined) => {
  if (!p.runs || !now) return <Unread label="last collect not read yet" />;
  return p.runs.lastCollected ? agoWords(p.runs.lastCollected, now) : <HonestyChip key="c" kind="unknown" meaning="Nothing collected yet">never</HonestyChip>;
};

/**
 * /vitals: the real projects Afterlife watches, from .belay/projects. Enter or a double-click opens one. The screen host
 * draws it from two slices (screen/host.tsx): `projects` absent: the window and the table's head, nothing listed yet;
 * a row's `runs` absent: its last collected and runs stored are dashes until the runs are read. `reason`: why the
 * projects could not be read.
 */
export function VitalsListScreen({ projects, now, reason }: { projects?: readonly ListRow[]; now?: string; reason?: string }) {
  const { navigate } = useHostNav();
  const [picked, setSel] = useState<string | null>(null);
  const sel = picked ?? projects?.[0]?.slug ?? null;
  const empty = projects?.length === 0;
  const n = projects?.length;
  return (
    <Window
      title="Vitals"
      subtitle={n === undefined ? '— real projects' : empty ? 'no real project yet' : `${n} real project${n === 1 ? '' : 's'}`}
      realData
      status={empty ? 'Onboard a project to start measuring it' : 'Enter or double-click a project to open its vitals'}
    >
      <PaneScroll>
        <Reveal order={1} slice="config" className={styles.bands}>
          {reason ? <Unreadable what="The saved projects" reason={reason} /> : null}
          {empty ? (
            <VitalsEmpty />
          ) : reason ? null : (
            <BandTable
              label="Real projects"
              columns={COLUMNS}
              min={1000}
              head={HEAD}
              selected={sel}
              onSelect={setSel}
              onActivate={(slug) => navigate(`/vitals/${encodeURIComponent(slug)}`)}
              rows={(projects ?? []).map((p) => ({
                id: p.slug,
                title: p.slug,
                cells: [
                  <Link key="n" href={`/vitals/${encodeURIComponent(p.slug)}`}>{p.name}</Link>,
                  <span key="r" className={styles.mono} title={p.root}>{p.root}</span>,
                  p.host,
                  p.ci,
                  p.cloud,
                  lastCell(p, now),
                  p.runs ? p.runs.runsStored : <Unread key="s" label="runs stored not read yet" />,
                ],
              }))}
            />
          )}
        </Reveal>
      </PaneScroll>
    </Window>
  );
}
