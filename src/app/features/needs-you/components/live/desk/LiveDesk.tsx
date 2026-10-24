'use client';

import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { groupNavId } from '@/components/table/model/rowNavigation';
import { plural } from '@/lib/format/plural';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import type { LiveDeskState } from '../../../hooks/useLiveDesk';
import { summarize, type DeskItem, type Grouping } from '../../../model/desk';
import type { LiveEvidence } from '../../../model/evidence/evidence';
import { OutboxIcon } from '../../chrome/OutboxIcon';
import chrome from '../../chrome/chrome.module.css';
import { useRunnerStrip } from '../../runner/RunnerStrip';
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
  runner: readonly RunnerNeed[];
  /** When the page was read: every age is counted from it. */
  now: Date;
  desk: LiveDeskState;
}

/**
 * Live mode's desk, the demo desk's skeleton over the group's own items: the summary band, the grouped table, the
 * inspector ("The click": the server's commands and diff, Stage and Run) and the outbox with Run all. Nothing the demo
 * seeded is drawn; a row this desk cannot write says where to act.
 */
export function LiveDesk({ rows, seeded, project, evidence, runner, now, desk: d }: LiveDeskProps) {
  const sentIds = Object.keys(d.sent);
  const waiting = rows.filter((n) => waits(n, d.out, sentIds)).length;
  const group = d.groups.find((g) => groupNavId(g.id) === d.sel) ?? null;
  const n = d.selected;
  const runnerUi = useRunnerStrip(runner);
  return (
    <Window
      title="Needs you"
      subtitle={project}
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
        <LiveInspector
          item={n} group={group} view={n ? d.views[n.id] : undefined} answer={n ? d.answers[n.id] : undefined} evidence={n ? evidence[n.id] : undefined}
          sending={!!n && d.sending.includes(n.id)} staged={!!n && d.out.order.includes(n.id)} running={d.out.running} now={now} inspectorRef={d.inspectorRef}
          onRun={() => n && d.run(n.id)} onRetry={() => n && d.retry(n.id)} onStage={() => n && d.toggleStage(n.id)}
        />
      }
      inspectorOpen={d.inspectorOpen}
      onInspectorOpenChange={d.setInspectorOpen}
      status={`${plural(rows.filter((r) => r.kind !== 'decided').length, 'decision')} · ${waiting} waiting · ${d.out.order.length} in outbox · read from your GitLab group by the last poll`}
    >
      <div className={styles.content}>
        <div className={styles.page}>
          <PaneScroll padded={false}>
            {runnerUi.strip}
            <LiveBand summary={summarize(rows)} now={now} seeded={seeded} />
            <div className={styles.tw}>
              <LiveTable
                groups={d.groups} shut={d.shut} sel={d.sel} out={d.out} sent={sentIds} now={now} tableRef={d.tableRef} onKeyDown={d.onKeyDown}
                onSelect={d.select} onToggleGroup={(id) => d.toggleGroup(id)} onActivate={d.focusInspector} onStage={d.toggleStage}
              />
            </div>
          </PaneScroll>
        </div>
        {d.outboxOpen ? (
          <LiveOutbox
            rows={rows} out={d.out} views={d.views} sent={d.sent} answers={d.answers} sel={d.sel} onSelect={d.select} onRun={d.run}
            onRunAll={() => void d.runAll()} onRetry={d.retry} onUnstage={d.toggleStage} onClose={() => d.setOutboxOpen(false)}
          />
        ) : null}
        {runnerUi.sheet}
      </div>
    </Window>
  );
}
