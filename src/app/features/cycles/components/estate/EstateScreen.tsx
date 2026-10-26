'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { Reveal, Unread } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { plural, pluralWord } from '@/lib/format/plural';
import type { EstateCycles, EstateSummary } from '../../model/estate/split';
import { AnswerPending, InspectorPending } from '../pending/CyclesPending';
import { ScopeSwitch } from '../ScopeSwitch';
import { EstateBand } from './EstateBand';
import { EstateInspector } from './EstateInspector';
import { EstateTable } from './EstateTable';
import styles from './estate.module.css';

/**
 * Cycles across the estate: every project whose ledger records a closed cycle, rolled up per group, each history
 * checked against that project's rungs today. Onboard arms more projects; each then appears here with its own rounds.
 * The screen host draws it from two slices: `data` (the groups and their rows) absent, the same window with a dash for
 * every value; `cycles` (each project's closed cycles) absent, the inspector's "Every cycle" is a dash.
 */
export function EstateScreen({ data, cycles }: { data?: EstateSummary; cycles?: EstateCycles }) {
  const rows = data ? data.groups.flatMap((g) => g.projects) : [];
  const [group, setGroup] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // the deep project until a pick: derived, so the estate landing late (or a re-read) never resets a pick
  const sel = picked ?? rows.find((r) => r.id === data?.deep)?.id ?? rows[0]?.id ?? null;
  const shown = data ? (group ? data.groups.filter((g) => g.group === group) : data.groups) : [];
  const project = rows.find((r) => r.id === sel) ?? null;
  return (
    <Window
      title="Cycles"
      subtitle={`${data?.org ?? '—'} / estate`}
      toolbar={
        <>
          <ScopeSwitch scope="estate" project={data?.deep} />
          <Spacer />
        </>
      }
      sidebar={
        <Reveal order={1} slice="estate">
          <SidebarSection title="Groups">
            <SidebarItem label="All groups" count={data ? data.inCycles : <Unread />} current={group === null} onClick={() => setGroup(null)} />
            {data?.groups.map((g) => (
              <SidebarItem key={g.group} label={g.group} count={g.projects.length} current={group === g.group} title={`${g.projects.length} of ${g.watching} watching projects in cycles`} onClick={() => setGroup(g.group)} />
            ))}
          </SidebarSection>
        </Reveal>
      }
      inspector={
        <Reveal order={4} slice="estate">
          {data ? <EstateInspector project={project} cycles={project ? cycles?.[project.id] : undefined} deep={data.deep} /> : <InspectorPending what="Reading the estate" />}
        </Reveal>
      }
      status={
        data ? (
          <>
            {plural(data.inCycles, 'project')} in cycles · {plural(data.closed, 'cycle')} closed · {data.reconciled} of {data.inCycles} replay to their rungs · {data.notCycling} watching, not in cycles
          </>
        ) : (
          <>
            <Unread /> projects in cycles · <Unread /> cycles closed · <Unread /> replay to their rungs
          </>
        )
      }
    >
      <div className={styles.content}>
        <Reveal order={2} slice="estate">
          {data ? <EstateBand data={data} /> : <AnswerPending label="Where the estate's cycles stand" unit="projects in cycles" />}
        </Reveal>
        <Reveal order={3} slice="estate">
          <EstateTable groups={shown} selected={sel} onSelect={setPicked} />
        </Reveal>
        <p className={styles.foot}>
          {data ? data.notCycling : <Unread />} watching {data ? pluralWord(data.notCycling, 'project has', 'projects have') : 'projects have'} no cycle yet. A project joins when T6 is armed on it and its first cycle closes.{' '}
          <Link href="/onboard/estate">Arm the next batch in Onboard ›</Link>
        </p>
      </div>
    </Window>
  );
}
