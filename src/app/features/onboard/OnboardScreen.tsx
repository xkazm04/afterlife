'use client';

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { Window } from '@/components/shell/Window';
import { BatchSheet } from './components/batch/BatchSheet';
import { BatchTable } from './components/batch/BatchTable';
import { Funnel } from './components/funnel/Funnel';
import { Baseline } from './components/groups/Baseline';
import { GroupBars } from './components/groups/GroupBars';
import { OnboardInspector } from './components/inspector/OnboardInspector';
import { OnboardLegend } from './components/OnboardLegend';
import { OnboardSidebar } from './components/OnboardSidebar';
import { OnboardStatus } from './components/OnboardStatus';
import { BATCH_SIZES, useOnboard } from './hooks/useOnboard';
import type { OnboardData } from './model/build';
import styles from './onboard.module.css';

/**
 * Onboard: a company's GitLab estate brought in as a funnel, discovered to in cycles, a batch at a time. Every read
 * runs on its own; every write is an MR opened as you after the exact commands, and waits for a person to merge it.
 * Only a probe moves a project on. Runs are simulated in the demo and say so.
 */
export function OnboardScreen({ data }: { data: OnboardData }) {
  const o = useOnboard(data);
  const scope = o.group ?? 'whole estate';
  const pending = o.batch.reads.length + o.batch.writes.length;
  return (
    <Window
      title="Onboard"
      subtitle={`${data.org} · ${data.host}`}
      toolbar={
        <>
          <SegmentedControl
            label="Writes per batch"
            value={o.size}
            onChange={o.setSize}
            options={BATCH_SIZES.map((n) => ({ value: n, label: `${n} MRs`, title: `At most ${n} MRs per batch; reads are not capped` }))}
          />
          <Spacer />
          <Button variant="primary" disabled={!pending} onClick={() => o.setSheet(true)} title="Preview the exact commands, then run as you">
            Preview batch · {pending}
          </Button>
        </>
      }
      sidebar={<OnboardSidebar groups={o.groups} total={data.projects.length} group={o.group} onGroup={o.setGroup} />}
      inspector={<OnboardInspector o={o} data={data} />}
      status={<OnboardStatus o={o} />}
      help={<OnboardLegend />}
      helpTitle="The funnel"
    >
      <div className={styles.content}>
        <Funnel counts={o.counts} filter={o.filter} onFilter={o.setFilter} />
        <div className={styles.cards}>
          <GroupBars groups={o.groups} selectedGroup={o.group} onGroup={o.setGroup} />
          <Baseline rows={o.base} />
        </div>
        <section aria-label="Next batch">
          <h2 className={styles.h}>
            Next batch <span>{scope}</span>
          </h2>
          <BatchTable batch={o.batch} runs={o.runs} byId={o.byId} org={data.org} filter={o.filter} selected={o.selected} onSelect={o.setSelected} onResolve={o.resolve} />
        </section>
      </div>
      {o.sheet ? <BatchSheet batch={o.batch} runs={o.runs} byId={o.byId} org={data.org} scope={scope} onRun={o.run} onClose={() => o.setSheet(false)} /> : null}
    </Window>
  );
}
