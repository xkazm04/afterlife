'use client';

import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import type { ReactNode } from 'react';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Reveal, Unread } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { groupNavId } from '@/components/table/model/rowNavigation';
import { plural } from '@/lib/format/plural';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import type { LiveDeskState } from '../../../hooks/useLiveDesk';
import { summarize, type DeskItem, type Grouping } from '../../../model/desk';
import type { LiveEvidence } from '../../../model/evidence/evidence';
import { OutboxIcon } from '../../chrome/OutboxIcon';
import chrome from '../../chrome/chrome.module.css';
import { RunnerPending, useRunnerStrip } from '../../runner/RunnerStrip';
import { StaleRegion } from '../../shared/StaleRegion';
import { LiveBand } from './LiveBand';
import { LiveInspector } from './LiveInspector';
import { LiveOutbox } from './LiveOutbox';
import { LiveTable, waits } from './LiveTable';
import styles from './desk.module.css';

const GROUPS: readonly SegmentOption<Grouping>[] = [
  { value: 'kind', label: 'By kind', title: 'Group by kind of decision' },
  { value: 'project', label: 'By project', title: 'Group by the project the proposal is for' },
  { value: 'deadline', label: 'By deadline', title: 'Group by deadline' },
];

export interface LiveDeskProps {
  rows: readonly DeskItem[];
  seeded: number;
  /** The project the writes are planned for (the server actions' id). */
  project: string;
  evidence: Readonly<Record<string, LiveEvidence>>;
  /** Null: not read yet (the screen host's desk slice): the strip's slot is held. */
  runner: readonly RunnerNeed[] | null;
  /** When the page was read: every age is counted from it. */
  now: Date;
  desk: LiveDeskState;
  /** The screen host's read: 'unread' (the window with dashes), 'empty' (`empty` says why, in the pane), else the desk. */
  phase?: 'unread' | 'empty' | 'read';
  empty?: ReactNode;
  /** The rows are the last visit's (when they were read), re-reading: each region says so and cannot be acted on. */
  stale?: string | null;
}

/**
 * Live mode's desk, the demo desk's layout over the group's own items: the summary band, the grouped table, the
 * inspector ("The click": the server's commands and diff, Stage and Run) and the outbox with Run all. Nothing the demo
 * seeded is drawn; a row this desk cannot write says where to act.
 */
export function LiveDesk({ rows, seeded, project, evidence, runner, now, desk: d, phase = 'read', empty, stale = null }: LiveDeskProps) {
  const sentIds = Object.keys(d.sent);
  const waiting = rows.filter((n) => waits(n, d.out, sentIds)).length;
  const group = d.groups.find((g) => groupNavId(g.id) === d.sel) ?? null;
  const n = d.selected;
  const runnerUi = useRunnerStrip(runner ?? []);
  const read = phase === 'read';
  return (
    <Window
      title="Needs you"
      subtitle={project || '—'}
      toolbar={
        <>
          <SegmentedControl label="Group by" options={GROUPS} value={d.grouping} onChange={d.setGrouping} />
          <Spacer />
          <ToolbarButton pressed={d.outboxOpen} title="Show or hide the outbox: staged writes wait here for Run all" onClick={() => d.setOutboxOpen(!d.outboxOpen)}>
            <span className={chrome.btn}>
              <OutboxIcon />
              <span>Outbox</span>
              {d.out.order.length ? <span className={chrome.badge}>{d.out.order.length}</span> : null}
            </span>
          </ToolbarButton>
        </>
      }
      inspector={
        phase === 'empty' ? undefined : !read ? (
          <InspectorHeader title={<Unread label="decision not read yet" />} sub="Reading your group" />
        ) : (
        <LiveInspector
          item={n} group={group} view={n ? d.views[n.id] : undefined} answer={n ? d.answers[n.id] : undefined} evidence={n ? evidence[n.id] : undefined}
          sending={!!n && d.sending.includes(n.id)} staged={!!n && d.out.order.includes(n.id)} running={d.out.running} now={now} inspectorRef={d.inspectorRef}
          onRun={() => n && d.run(n.id)} onRetry={() => n && d.retry(n.id)} onStage={() => n && d.toggleStage(n.id)}
        />
        )
      }
      inspectorOpen={d.inspectorOpen}
      onInspectorOpenChange={d.setInspectorOpen}
      status={
        read ? (
          `${plural(rows.filter((r) => r.kind !== 'decided').length, 'decision')} · ${waiting} waiting · ${d.out.order.length} in outbox · read from your GitLab group by the last poll`
        ) : phase === 'empty' ? (
          'no decision from your group · read from your GitLab group by the last poll'
        ) : (
          <>
            <Unread label="decisions not read yet" /> decisions · <Unread label="waiting not read yet" /> waiting
          </>
        )
      }
    >
      <div className={styles.content}>
        <div className={styles.page}>
          <PaneScroll padded={false}>
            <Reveal order={1} slice="desk">
              {runner === null ? <RunnerPending /> : runnerUi.strip}
            </Reveal>
            {phase === 'empty' ? (
              <Reveal order={2} slice="view">{empty}</Reveal>
            ) : (
              <>
                <StaleRegion asOf={stale} label="What waits">
                  <Reveal order={2} slice="view">
                    {read ? <LiveBand summary={summarize(rows)} now={now} seeded={seeded} /> : <section className={styles.band} aria-busy="true"><Unread label="decisions not read yet" /></section>}
                  </Reveal>
                </StaleRegion>
                <StaleRegion asOf={stale} label="The decisions" className={styles.tw}>
                  <Reveal order={3} slice="view">
                    <LiveTable
                      groups={read ? d.groups : []} unread={!read} shut={d.shut} sel={d.sel} out={d.out} sent={sentIds} now={now} tableRef={d.tableRef} onKeyDown={d.onKeyDown}
                      onSelect={d.select} onToggleGroup={(id) => d.toggleGroup(id)} onActivate={d.focusInspector} onStage={d.toggleStage}
                    />
                  </Reveal>
                </StaleRegion>
              </>
            )}
          </PaneScroll>
        </div>
        {d.outboxOpen && phase !== 'empty' ? (
          <StaleRegion asOf={stale} label="The outbox">
          <LiveOutbox
            rows={rows} out={d.out} views={d.views} sent={d.sent} answers={d.answers} sel={d.sel} onSelect={d.select} onRun={d.run}
            onRunAll={() => void d.runAll()} onRetry={d.retry} onUnstage={d.toggleStage} onClose={() => d.setOutboxOpen(false)}
          />
          </StaleRegion>
        ) : null}
        {runnerUi.sheet}
      </div>
    </Window>
  );
}
