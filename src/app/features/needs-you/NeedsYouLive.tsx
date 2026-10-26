'use client';

import { useMemo, type ReactNode } from 'react';
import type { NeedsYouItem } from '@/lib/demo';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import type { DecidedItem } from '@/server/data/types';
import { LiveDesk } from './components/live/desk/LiveDesk';
import { useLiveDesk } from './hooks/useLiveDesk';
import { deskItems, type DeskItem } from './model/desk';
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
}

const NO_DECIDED: readonly DecidedItem[] = [];
const NO_ROWS: readonly DeskItem[] = [];
const NO_EVIDENCE: Readonly<Record<string, LiveEvidence>> = {};

/**
 * Live mode: the open inbox items the poller found in your group, as the index holds them, on the demo desk's layout
 * (model/desk builds the rows; components/live/desk draws them). The demo's desk (its five items, the !44 incident, the
 * patch-bump record) is never drawn here, nor any item the demo seeded. A promotion, a re-admit or a templated gap has one
 * write through the server actions; the rest are read-only and say where to act.
 * On the screen host: `view` null is not read yet (the window paints with dashes), `empty` is the honest empty state in
 * the same window; `runner` null: the cycle runner's line is not read yet; `wanted`: the URL's `?item=` on this visit;
 * `stale`: the rows are the last visit's, re-reading.
 */
export function NeedsYouLive({ view, empty, runner, wanted = null, stale = null }: {
  view: NeedsYouLiveProps | null;
  empty?: ReactNode;
  runner: readonly RunnerNeed[] | null;
  wanted?: string | null;
  stale?: string | null;
}) {
  const now = view?.now;
  const at = useMemo(() => new Date(now ?? 0), [now]);
  const rows = useMemo(() => (view ? deskItems(view.items, view.decided ?? NO_DECIDED, view.project, at) : NO_ROWS), [view, at]);
  const evidence = view?.evidence ?? NO_EVIDENCE;
  const desk = useLiveDesk(rows, evidence, wanted);
  return (
    <LiveDesk
      rows={rows}
      seeded={view?.seeded ?? 0}
      project={view?.project ?? ''}
      evidence={evidence}
      runner={runner}
      now={at}
      desk={desk}
      phase={empty ? 'empty' : view ? 'read' : 'unread'}
      empty={empty}
      stale={stale}
    />
  );
}
