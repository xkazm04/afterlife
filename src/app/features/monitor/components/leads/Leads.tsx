'use client';

import { memo, useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { markTest } from '../../model/totals';
import type { FleetProject } from '@/lib/demo/types';
import type { Lead, MarkKind } from '../../model/types';
import { LeadCells } from './LeadCells';
import { LeadStrip } from './LeadStrip';
import styles from './leads.module.css';

interface RowProps {
  lead: Lead;
  open: boolean;
  thin: boolean;
  selected: string | null;
  match: ReadonlySet<string> | null;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  onLeadHover: (group: string | null) => void;
  onToggle: (group: string) => void;
}

const LeadRow = memo(function LeadRow({ lead, open, thin, selected, match, onPick, onHover, onLeadHover, onToggle }: RowProps) {
  const inLead = lead.projects.some((p) => p.id === selected);
  const tabId = inLead ? selected : (lead.projects[0]?.id ?? null);
  const body = open ? (
    <LeadCells projects={lead.projects} selected={selected} match={match} tabId={tabId} onPick={onPick} onHover={onHover} />
  ) : (
    <LeadStrip projects={lead.projects} thin={thin} selected={selected} match={match} tabId={tabId} onPick={onPick} onHover={onHover} />
  );
  return (
    <div className={styles.row} data-thin={thin || undefined} data-open={open || undefined}>
      <button
        type="button"
        className={styles.plate}
        aria-expanded={open}
        title={open ? `Close ${lead.group}` : `Open ${lead.group} into named cells`}
        onClick={() => onToggle(lead.group)}
        onPointerEnter={() => onLeadHover(lead.group)}
        onPointerLeave={() => onLeadHover(null)}
      >
        <span className={styles.pn}>{lead.group}</span>
        <span className={styles.pc}>{lead.projects.length}</span>
      </button>
      {body}
      <div className={styles.counts}>
        {lead.needs ? <span className={styles.amber} title={`${lead.needs} decisions wait`}>{lead.needs}</span> : null}
        {lead.stale ? <span className={styles.staleChip}>{lead.stale} stale</span> : null}
      </div>
    </div>
  );
});

/** The next beat for an arrow key: along the lead, or the same place on the lead above or below. */
function step(leads: readonly Lead[], id: string | null, key: string): string | null {
  const li = leads.findIndex((l) => l.projects.some((p) => p.id === id));
  const here = leads[li];
  if (!here) return leads[0]?.projects[0]?.id ?? null;
  const list = here.projects;
  const i = list.findIndex((p) => p.id === id);
  if (key === 'ArrowLeft') return list[Math.max(0, i - 1)]?.id ?? id;
  if (key === 'ArrowRight') return list[Math.min(list.length - 1, i + 1)]?.id ?? id;
  const to = leads[li + (key === 'ArrowUp' ? -1 : 1)]?.projects;
  if (!to?.length) return id;
  return to[Math.min(to.length - 1, Math.round((i / Math.max(1, list.length - 1)) * (to.length - 1)))]?.id ?? id;
}

/**
 * Seven leads, one per group. Arrows move the selection beat to beat and lead to lead; Enter opens the lead into
 * named cells; the open lead takes the room and the others shrink to thin traces.
 */
export function Leads({
  leads,
  projects,
  openLead,
  selected,
  mark,
  paused,
  onPick,
  onHover,
  onLeadHover,
  onToggle,
}: {
  leads: readonly Lead[];
  projects: readonly FleetProject[];
  openLead: string | null;
  selected: string | null;
  mark: MarkKind | null;
  paused: boolean;
  onPick: (id: string) => void;
  onHover: (id: string | null) => void;
  onLeadHover: (group: string | null) => void;
  onToggle: (group: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const match = useMemo(() => (mark ? new Set(projects.filter(markTest(mark)).map((p) => p.id)) : null), [mark, projects]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const next = step(leads, selected, e.key);
        if (!next) return;
        onPick(next);
        requestAnimationFrame(() => ref.current?.querySelector<HTMLElement | SVGElement>(`[data-id="${next}"]`)?.focus());
      } else if (e.key === 'Enter' && (e.target as Element).getAttribute('role') === 'button') {
        const lead = leads.find((l) => l.projects.some((p) => p.id === selected));
        if (lead) onToggle(lead.group);
      }
    },
    [leads, selected, onPick, onToggle],
  );

  return (
    <div ref={ref} className={styles.leads} data-paused={paused || undefined} onKeyDown={onKeyDown} aria-label="Leads, one per group">
      {leads.map((l) => (
        <LeadRow
          key={l.group}
          lead={l}
          open={openLead === l.group}
          thin={openLead !== null && openLead !== l.group}
          selected={selected}
          match={match}
          onPick={onPick}
          onHover={onHover}
          onLeadHover={onLeadHover}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
