'use client';

import type { FleetProject } from '@/lib/demo/types';
import type { CostSum } from '@/lib/runs/desk/join';
import { plural } from '@/lib/format/plural';
import { leadLine, stateLine, topWaiting } from '../../model/totals';
import type { Lead, Totals } from '../../model/types';
import type { Hover } from '../../hooks/useMonitor';
import styles from './answer.module.css';

/** The fleet's agent spend in one line; null (not read, or no project metered): no line at all, never $0. */
export function spendLine(cost: CostSum | null): string | null {
  if (!cost || cost.costUsd === null) return null;
  return `agents spent $${cost.costUsd.toFixed(2)} across ${plural(cost.metered, 'metered project')} · all recorded runs`;
}

/**
 * The band above the leads: the one loud number on the left, and the readout on the right. The readout names
 * whatever the pointer or the keyboard is on (a beat or a lead), so the leads themselves carry almost no text. With
 * nothing under the pointer, it also says what the agents spent (`cost`, read beside the fleet).
 */
export function AnswerBand({
  org,
  totals,
  projects,
  leads,
  hover,
  byId,
  cost = null,
}: {
  org: string;
  totals: Totals;
  projects: readonly FleetProject[];
  leads: readonly Lead[];
  hover: Hover;
  byId: ReadonlyMap<string, FleetProject>;
  cost?: CostSum | null;
}) {
  const top = topWaiting(projects, 4);
  let name = org;
  let line = `${plural(leads.length, 'lead')} · ${plural(totals.n, 'project')}`;
  let tone: string | undefined;
  let spend = spendLine(cost);
  if (hover?.kind === 'project') {
    const p = byId.get(hover.id);
    if (p) {
      name = p.name;
      line = `${p.group} · ${stateLine(p)}`;
      tone = p.state;
      spend = null;
    }
  } else if (hover?.kind === 'lead') {
    const l = leads.find((x) => x.group === hover.group);
    if (l) {
      name = l.group;
      line = leadLine(l);
      spend = null;
    }
  }
  return (
    <div className={styles.band}>
      <div className={styles.answer}>
        <span className={styles.big}>{totals.needs}</span>
        <span className={styles.words}>
          <span className={styles.head}>{totals.needs === 1 ? 'decision waits for you' : 'decisions wait for you'}</span>
          <span className={styles.who}>
            {totals.needs ? `in ${plural(totals.needsP, 'project')}` : `all clear across ${plural(totals.n, 'project')}`}
            {top.length ? ' · most at ' : ''}
            {top.map((p, i) => (
              <span key={p.id}>
                {i ? ', ' : ''}
                <b>{p.name}</b> {p.needsYou}
              </span>
            ))}
          </span>
        </span>
      </div>
      <div className={styles.readout} aria-live="polite" data-tone={tone}>
        <span className={styles.roName}>{name}</span>
        <span className={styles.roLine}>{line}</span>
        {spend ? <span className={styles.roLine}>{spend}</span> : null}
      </div>
    </div>
  );
}
