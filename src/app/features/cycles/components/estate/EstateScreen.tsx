'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { Window } from '@/components/shell/Window';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import type { EstateData } from '../../model/estate/estate';
import { ScopeSwitch } from '../ScopeSwitch';
import { EstateBand } from './EstateBand';
import { EstateInspector } from './EstateInspector';
import { EstateTable } from './EstateTable';
import styles from './estate.module.css';

/**
 * Cycles across the estate: every project whose ledger records a closed cycle, rolled up per group, each history
 * checked against that project's rungs today. Onboard arms more projects; each then appears here with its own rounds.
 */
export function EstateScreen({ data }: { data: EstateData }) {
  const rows = data.groups.flatMap((g) => g.projects);
  const [group, setGroup] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(rows.find((r) => r.id === data.deep)?.id ?? rows[0]?.id ?? null);
  const shown = group ? data.groups.filter((g) => g.group === group) : data.groups;
  return (
    <Window
      title="Cycles"
      subtitle={`${data.org} / estate`}
      toolbar={
        <>
          <ScopeSwitch scope="estate" project={data.deep} />
          <Spacer />
        </>
      }
      sidebar={
        <SidebarSection title="Groups">
          <SidebarItem label="All groups" count={data.inCycles} current={group === null} onClick={() => setGroup(null)} />
          {data.groups.map((g) => (
            <SidebarItem key={g.group} label={g.group} count={g.projects.length} current={group === g.group} title={`${g.projects.length} of ${g.watching} watching projects in cycles`} onClick={() => setGroup(g.group)} />
          ))}
        </SidebarSection>
      }
      inspector={<EstateInspector project={rows.find((r) => r.id === sel) ?? null} deep={data.deep} />}
      status={
        <>
          {data.inCycles} projects in cycles · {data.closed} cycles closed · {data.reconciled} of {data.inCycles} replay to their rungs · {data.notCycling} watching, not in cycles
        </>
      }
    >
      <div className={styles.content}>
        <EstateBand data={data} />
        <EstateTable groups={shown} selected={sel} onSelect={setSel} />
        <p className={styles.foot}>
          {data.notCycling} watching projects have no cycle yet. A project joins when T6 is armed on it and its first cycle closes.{' '}
          <Link href="/onboard">Arm the next batch in Onboard ›</Link>
        </p>
      </div>
    </Window>
  );
}
