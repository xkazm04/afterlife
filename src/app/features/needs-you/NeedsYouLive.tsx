'use client';

import { useMemo } from 'react';
import type { NeedsYouItem } from '@/lib/demo';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import type { DecidedItem } from '@/server/data/types';
import { LiveDesk } from './components/live/desk/LiveDesk';
import { useLiveDesk } from './hooks/useLiveDesk';
import { deskItems } from './model/desk';
import type { LiveEvidence } from './model/evidence/evidence';

export interface NeedsYouLiveProps {
  items: readonly NeedsYouItem[];
  seeded: number;
  /** The project the items belong to: the id the server actions plan the writes for. */
  project: string;
  /** Each promotion's and re-admit's class as the snapshot holds it now, by item id. */
  evidence: Readonly<Record<string, LiveEvidence>>;
  /** What was acted on this week (the data source's decided list), drawn last. */
  decided?: readonly DecidedItem[];
  /** When the server read the page (ISO): ages are counted from it, so the hydrated page agrees with the HTML. */
  now: string;
  /** The cycle runner's decisions (real local data), drawn above the group's. */
  runner?: readonly RunnerNeed[];
}

const NO_DECIDED: readonly DecidedItem[] = [];

/**
 * Live mode: the open inbox items the poller found in your group, as the index holds them, on the demo desk's skeleton
 * (model/desk builds the rows; components/live/desk draws them). The demo's desk (its five items, the !44 incident, the
 * patch-bump record) is never drawn here, nor any item the demo seeded. A promotion, a re-admit or a templated gap has one
 * write through the server actions; the rest are read-only and say where to act.
 */
export function NeedsYouLive({ items, seeded, project, evidence, decided = NO_DECIDED, now, runner = [] }: NeedsYouLiveProps) {
  const at = useMemo(() => new Date(now), [now]);
  const rows = useMemo(() => deskItems(items, decided, project, at), [items, decided, project, at]);
  const desk = useLiveDesk(rows, evidence);
  return <LiveDesk rows={rows} seeded={seeded} project={project} evidence={evidence} runner={runner} now={at} desk={desk} />;
}
