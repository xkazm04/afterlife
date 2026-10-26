'use client';

import type { FleetProject } from '@/lib/demo/types';
import type { CostSum } from '@/lib/runs/desk/join';
import type { TrendFeed } from '@/lib/trend/trend';
import { Reveal } from '@/components/shell/host';
import { plural } from '@/lib/format/plural';
import { leadLine, stateLine, topWaiting } from '../../model/totals';
import type { Lead, Totals } from '../../model/types';
import type { Hover } from '../../hooks/useMonitor';
import styles from './answer.module.css';
import { WeekNote } from './WeekNote';

/** The fleet's agent spend in one line; null (not read, or no project metered): no line at all, never $0. */
export function spendLine(cost: CostSum | null): string | null {
  if (!cost || cost.costUsd === null) return null;
  return `agents spent $${cost.costUsd.toFixed(2)} across ${plural(cost.metered, 'metered project')} · all recorded runs`;
}

/**
 * The band above the leads: the one loud number on the left, and the readout on the right. The readout names
 * whatever the pointer or the keyboard is on (a beat or a lead), so the leads themselves carry almost no text. With
 * nothing under the pointer, it also says what the agents spent (`cost`, read beside the fleet). `trend`, when read, puts
 * the week's change beside the big number. Both enter in place (Reveal) when they land after the fleet.
 */
export function AnswerBand({
  org,
  totals,
  projects,
  leads,
  hover,
  byId,
  cost = null,
  trend = null,
}: {
  org: string;
  totals: Totals;
  projects: readonly FleetProject[];
  leads: readonly Lead[];
  hover: Hover;
  byId: ReadonlyMap<string, FleetProject>;
  cost?: CostSum | null;
  trend?: TrendFeed | null;
}) {
  const top = topWaiting(projects, 4);
  let name = org;
  let line = `${plural(leads.length, 'lead')} · ${plural(totals.n, 'project')}`;
  let tone: string | undefined;
  let spend = spendLine(cost);
  // a beat or a lead in focus already says this as its own aria-label / text: the readout is then a sighted echo, not a second announcement
  let echo = false;
  if (hover?.kind === 'project') {
    const p = byId.get(hover.id);
    if (p) {
      name = p.name;
      line = `${p.group} · ${stateLine(p)}`;
      tone = p.state;
      spend = null;
      echo = true;
    }
  } else if (hover?.kind === 'lead') {
    const l = leads.find((x) => x.group === hover.group);
    if (l) {
      name = l.group;
      line = leadLine(l);
      spend = null;
      echo = true;
    }
  }
  return (
    <div className={styles.band}>
      <div className={styles.answer}>
        <span className={styles.big}>{totals.needs}</span>
        {trend ? (
          <Reveal>
            <WeekNote feed={trend} />
          </Reveal>
        ) : null}
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
      <div className={styles.readout} aria-hidden={echo || undefined} data-tone={tone}>
        <span className={styles.roName}>{name}</span>
        <span className={styles.roLine}>{line}</span>
        {/* mounted while the spend is read (the pointer only empties it), so it enters once, when the desk lands */}
        {spendLine(cost) ? <Reveal className={styles.roLine}>{spend}</Reveal> : null}
      </div>
    </div>
  );
}
