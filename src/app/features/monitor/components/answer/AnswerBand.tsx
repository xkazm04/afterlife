'use client';

import type { FleetProject } from '@/lib/demo/types';
import { leadLine, stateLine, topWaiting } from '../../model/totals';
import type { Lead, Totals } from '../../model/types';
import type { Hover } from '../../hooks/useMonitor';
import styles from './answer.module.css';

/**
 * The band above the leads: the one loud number on the left, and the readout on the right. The readout names
 * whatever the pointer or the keyboard is on (a beat or a lead), so the leads themselves carry almost no text.
 */
export function AnswerBand({
  org,
  totals,
  projects,
  leads,
  hover,
  byId,
}: {
  org: string;
  totals: Totals;
  projects: readonly FleetProject[];
  leads: readonly Lead[];
  hover: Hover;
  byId: ReadonlyMap<string, FleetProject>;
}) {
  const top = topWaiting(projects, 4);
  let name = org;
  let line = `${leads.length} leads · ${totals.n} projects`;
  let tone: string | undefined;
  if (hover?.kind === 'project') {
    const p = byId.get(hover.id);
    if (p) {
      name = p.name;
      line = `${p.group} · ${stateLine(p)}`;
      tone = p.state;
    }
  } else if (hover?.kind === 'lead') {
    const l = leads.find((x) => x.group === hover.group);
    if (l) {
      name = l.group;
      line = leadLine(l);
    }
  }
  return (
    <div className={styles.band}>
      <div className={styles.answer}>
        <span className={styles.big}>{totals.needs}</span>
        <span className={styles.words}>
          <span className={styles.head}>decisions wait for you</span>
          <span className={styles.who}>
            in {totals.needsP} projects
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
      </div>
    </div>
  );
}
