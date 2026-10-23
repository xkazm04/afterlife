'use client';

import { useCallback, useState } from 'react';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Spacer } from '@/components/controls/Spacer';
import { useToast } from '@/components/overlays/toast/useToast';
import { Window } from '@/components/shell/Window';
import { AnswerBand } from './components/answer/AnswerBand';
import { MonitorInspector } from './components/inspector/MonitorInspector';
import { Leads } from './components/leads/Leads';
import { MonitorLegend } from './components/MonitorLegend';
import { MonitorSidebar } from './components/MonitorSidebar';
import { MonitorStatus } from './components/MonitorStatus';
import { useMonitor } from './hooks/useMonitor';
import type { MonitorData, MonitorEstate } from './model/types';
import styles from './monitor.module.css';

/**
 * Monitor: the whole fleet as phosphor leads, one per group, every project a beat. Amber pips are what waits
 * for you; pick a beat and act on it in the inspector. Demo: nothing leaves the browser. Live: Resolve opens Needs you and Re-poll runs a real poll.
 * `estate` is what the route reads beside the fleet (the agents' spend, each project's agent-MR stability); absent, the
 * readout and the inspector say nothing of it.
 */
export function MonitorScreen({ data, estate }: { data: MonitorData; estate?: MonitorEstate }) {
  const { status } = useToast();
  const m = useMonitor(data);
  const [paused, setPaused] = useState(false);
  const { setSelected, setHover } = m;
  // the deep project's own feed age (null: no good poll yet); a fresh snapshot restarts the counter
  const deepAge = m.byId.get(data.deepId)?.feed.ageSec ?? null;

  const onPick = useCallback((id: string) => setSelected(id), [setSelected]);
  const onHover = useCallback((id: string | null) => setHover(id ? { kind: 'project', id } : null), [setHover]);
  const onLeadHover = useCallback((group: string | null) => setHover(group ? { kind: 'lead', group } : null), [setHover]);

  return (
    <Window
      title="Monitor"
      subtitle={`${data.org} · as of ${data.asOf}`}
      toolbar={
        <>
          <Spacer />
          <ToolbarButton pressed={!paused} title={paused ? 'Resume the sweep' : 'Pause the sweep'} aria-label="Sweep animation" onClick={() => setPaused((v) => !v)}>
            Sweep
          </ToolbarButton>
        </>
      }
      sidebar={<MonitorSidebar totals={m.totals} leads={m.leads} mark={m.mark} openLead={m.openLead} onMark={m.toggleMark} onLead={m.toggleLead} />}
      inspector={
        <MonitorInspector
          p={m.selected ? (m.byId.get(m.selected) ?? null) : null}
          org={data.org}
          totals={m.totals}
          projects={m.projects}
          stages={data.stages}
          deepId={data.deepId}
          needs={data.needs}
          live={data.mode === 'live'}
          done={m.done}
          onPick={onPick}
          onResolve={(needId, does) => {
            m.resolve(needId);
            status(does);
          }}
          onFlash={status}
          onRepoll={(id) => m.repoll(id, status)}
          stability={m.selected ? estate?.stability?.[m.selected] : undefined}
        />
      }
      status={
        <MonitorStatus
          key={deepAge ?? 'none'}
          n={m.totals.n}
          leads={m.leads.length}
          waiting={m.totals.needs}
          mode={data.mode}
          ageSec={deepAge}
        />
      }
      help={<MonitorLegend />}
      helpTitle="Beat grammar"
    >
      <div className={styles.pane}>
        <AnswerBand org={data.org} totals={m.totals} projects={m.projects} leads={m.leads} hover={m.hover} byId={m.byId} cost={estate?.cost ?? null} trend={estate?.trend ?? null} />
        <Leads
          leads={m.leads}
          projects={m.projects}
          openLead={m.openLead}
          selected={m.selected}
          mark={m.mark}
          paused={paused}
          onPick={onPick}
          onHover={onHover}
          onLeadHover={onLeadHover}
          onToggle={m.toggleLead}
        />
      </div>
    </Window>
  );
}
