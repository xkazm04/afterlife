'use client';

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { Reveal, Unread } from '@/components/shell/host';
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
 * runs on its own; every write is an MR opened as you after the server's exact preview, and waits for a person to merge
 * it. Only a probe moves a project on. Reads are simulated and say so.
 * The screen host draws it from the core slice (screen/host.tsx): `data` absent, the same window with the batch sizes and
 * the funnel's step names at once and a dash for every count. `onWritten` re-reads the estate after confirmed writes.
 */
export function OnboardScreen({ data, startPreview = false, onWritten }: { data?: OnboardData; startPreview?: boolean; onWritten?: () => void }) {
  const o = useOnboard(data, startPreview, undefined, onWritten);
  const scope = o.group ?? 'whole estate';
  const pending = o.batch.reads.length + o.batch.writes.length;
  return (
    <Window
      title="Onboard"
      subtitle={data ? `${data.org} · ${data.host}` : '— · —'}
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
            Preview batch · {data ? pending : <Unread label="batch not read yet" />}
          </Button>
        </>
      }
      sidebar={
        <Reveal order={1} slice="core">
          <OnboardSidebar groups={o.groups} total={data?.projects.length} group={o.group} onGroup={o.setGroup} />
        </Reveal>
      }
      inspector={
        <Reveal order={5} slice="core">
          {data ? <OnboardInspector o={o} data={data} /> : <InspectorHeader title={<Unread label="estate not read yet" />} sub="Reading the estate" />}
        </Reveal>
      }
      status={<OnboardStatus o={o} />}
      help={<OnboardLegend />}
      helpTitle="The funnel"
    >
      <div className={styles.content}>
        <Reveal order={2} slice="core">
          <Funnel counts={o.counts} filter={o.filter} onFilter={o.setFilter} unread={!data} />
        </Reveal>
        <Reveal order={3} slice="core" className={styles.cards}>
          <GroupBars groups={o.groups} selectedGroup={o.group} onGroup={o.setGroup} />
          <Baseline rows={o.base} unread={!data} />
        </Reveal>
        <Reveal order={4} slice="core">
          <section aria-label="Next batch">
            <h2 className={styles.h}>
              Next batch <span>{scope}</span>
            </h2>
            <BatchTable batch={o.batch} runs={o.runs} byId={o.byId} org={o.org} filter={o.filter} selected={o.selected} onSelect={o.setSelected} onResolve={o.resolve} unread={!data} />
          </section>
        </Reveal>
      </div>
      {o.sheet && data ? <BatchSheet batch={o.batch} runs={o.runs} byId={o.byId} org={o.org} scope={scope} writes={o.writes} running={o.running} onRun={() => void o.run()} onClose={() => o.setSheet(false)} /> : null}
    </Window>
  );
}
