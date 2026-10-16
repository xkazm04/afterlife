'use client';

import { memo, useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { step } from '../../model/nav';
import { decisionsWord, markTest } from '../../model/totals';
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
        {lead.needs ? <span className={styles.amber} title={decisionsWord(lead.needs)}>
            {lead.needs}
            <span className={styles.sr}> decisions</span>
          </span> : null}
        {lead.stale ? <span className={styles.staleChip}>{lead.stale} stale</span> : null}
      </div>
    </div>
  );
});

export interface LeadsKeyDeps {
  leads: readonly Lead[];
  selected: string | null;
  onPick: (id: string) => void;
  onToggle: (group: string) => void;
  /** Puts keyboard focus back on a beat once the render that follows has settled. */
  focusId: (id: string) => void;
}

/** Arrows move the pick; Enter opens or closes the lead. Either way the focused node may be replaced, so focus goes back to the selected beat. */
export function handleLeadsKey(e: Pick<KeyboardEvent, 'key' | 'target' | 'preventDefault'>, d: LeadsKeyDeps): void {
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const next = step(d.leads, d.selected, e.key);
    if (!next) return;
    d.onPick(next);
    d.focusId(next);
  } else if (e.key === 'Enter' && (e.target as Element).getAttribute('role') === 'button') {
    const lead = d.leads.find((l) => l.projects.some((p) => p.id === d.selected));
    if (lead) d.onToggle(lead.group);
  }
}

/**
 * One lead per group. Arrows move the selection beat to beat and lead to lead; Enter opens the lead into
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

  const focusId = useCallback((id: string) => {
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement | SVGElement>(`[data-id="${id}"]`)?.focus());
  }, []);
  const onKeyDown = useCallback((e: KeyboardEvent) => handleLeadsKey(e, { leads, selected, onPick, onToggle, focusId }), [leads, selected, onPick, onToggle, focusId]);

  return (
    <div ref={ref} className={styles.leads} data-paused={paused || undefined} onKeyDown={onKeyDown} role="group" aria-label="Leads, one per group">
      {leads.length ? null : <div className={styles.empty}>No projects in this fleet yet. Set one up and its lead appears here.</div>}
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
