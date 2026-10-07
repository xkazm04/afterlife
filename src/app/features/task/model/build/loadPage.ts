import { LEDGER_AGE_SEC } from '../../data/pageFacts';
import { getDataSource } from '@/server/data';

/** What the screen says about itself, from the data source: demo keeps the prototype's constants, live reads the source. */
export interface PageFacts {
  live: boolean;
  /** The Window subtitle: "group / project". */
  subtitle: string;
  /** How old the last poll was when the page was built; null when no poll has happened. Demo: the prototype's 12 s. */
  pollAgeSec: number | null;
}

/** The poll age a page can state: a real, non-negative number of seconds, else null (never a made-up one). */
export const pollAgeOf = (sec: number | undefined): number | null => (typeof sec === 'number' && Number.isFinite(sec) && sec >= 0 ? sec : null);

export function loadPageFacts(): PageFacts {
  const ds = getDataSource();
  if (ds.mode !== 'live') return { live: false, subtitle: DEMO_SUBTITLE, pollAgeSec: LEDGER_AGE_SEC };
  const deep = ds.deepProjectId();
  const project = ds.getFleet().projects.find((p) => p.id === deep);
  return {
    live: true,
    subtitle: project ? `${project.group} / ${project.name}` : deep,
    pollAgeSec: pollAgeOf(ds.getCockpit().feed.lastPollSec),
  };
}

export const DEMO_SUBTITLE = 'acme-lab / ledgerline';
