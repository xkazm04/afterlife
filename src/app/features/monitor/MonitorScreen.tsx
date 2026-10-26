'use client';

import { useCallback, useState } from 'react';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Spacer } from '@/components/controls/Spacer';
import { useToast } from '@/components/overlays/toast/useToast';
import { Reveal } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { AnswerBand } from './components/answer/AnswerBand';
import { MonitorInspector } from './components/inspector/MonitorInspector';
import { Leads } from './components/leads/Leads';
import { MonitorLegend } from './components/MonitorLegend';
import { AnswerPending, CoreUnreadable, InspectorPending, LeadsPending, StatusPending } from './components/MonitorPending';
import { MonitorSidebar } from './components/MonitorSidebar';
import { MonitorStatus } from './components/MonitorStatus';
import { useMonitor } from './hooks/useMonitor';
import type { MonitorData, MonitorEstate } from './model/types';
import styles from './monitor.module.css';

/**
 * Monitor: the whole fleet as phosphor leads, one per group, every project a beat. Amber pips are what waits
 * for you; pick a beat and act on it in the inspector. Demo: nothing leaves the browser. Live: Resolve opens Needs you and Re-poll runs a real poll.
 * The screen host draws it from three slices (screen/host.tsx): `data` (the fleet) absent: the same window with a dash
 * for every value (`coreError`: why it could not be read); `estate` (spend, stability, trend), each part absent until
 * read: the readout and the inspector say nothing of it. `onPolled` re-reads the screen after a live re-poll.
 */
export function MonitorScreen({ data, estate, coreError, onPolled }: { data?: MonitorData; estate?: Partial<MonitorEstate>; coreError?: string; onPolled?: () => void }) {
  const { status } = useToast();
  const m = useMonitor(data, onPolled);
  const [paused, setPaused] = useState(false);
  const { setSelected, setHover } = m;
  // the deep project's own feed age (null: no good poll yet); a fresh snapshot restarts the counter
  const deepAge = data ? (m.byId.get(data.deepId)?.feed.ageSec ?? null) : null;
  const onPick = useCallback((id: string) => setSelected(id), [setSelected]);
  const onHover = useCallback((id: string | null) => setHover(id ? { kind: 'project', id } : null), [setHover]);
  const onLeadHover = useCallback((group: string | null) => setHover(group ? { kind: 'lead', group } : null), [setHover]);

  return (
    <Window
      title="Monitor"
      subtitle={data ? `${data.org} · as of ${data.asOf}` : '— · as of —'}
      toolbar={
        <>
          <Spacer />
          <ToolbarButton pressed={!paused} title={paused ? 'Resume the sweep' : 'Pause the sweep'} aria-label="Sweep animation" onClick={() => setPaused((v) => !v)}>
            Sweep
          </ToolbarButton>
        </>
      }
      sidebar={
        <Reveal order={1} slice="core">
          <MonitorSidebar totals={data ? m.totals : null} leads={m.leads} mark={m.mark} openLead={m.openLead} onMark={m.toggleMark} onLead={m.toggleLead} />
        </Reveal>
      }
      inspector={
        <Reveal order={4} slice="core">
          {data ? (
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
          ) : (
            <InspectorPending />
          )}
        </Reveal>
      }
      status={
        data ? (
          <MonitorStatus key={deepAge ?? 'none'} n={m.totals.n} leads={m.leads.length} waiting={m.totals.needs} mode={data.mode} ageSec={deepAge} />
        ) : (
          <StatusPending />
        )
      }
      help={<MonitorLegend />}
      helpTitle="Beat grammar"
    >
      <div className={styles.pane}>
        <Reveal order={2} slice="core" className={styles.bandRegion}>
          {data ? (
            <AnswerBand org={data.org} totals={m.totals} projects={m.projects} leads={m.leads} hover={m.hover} byId={m.byId} cost={estate?.cost ?? null} trend={estate?.trend ?? null} />
          ) : (
            <AnswerPending />
          )}
        </Reveal>
        <Reveal order={3} slice="core" className={styles.leadsRegion}>
          {data ? (
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
          ) : coreError ? (
            <CoreUnreadable reason={coreError} />
          ) : (
            <LeadsPending />
          )}
        </Reveal>
      </div>
    </Window>
  );
}
