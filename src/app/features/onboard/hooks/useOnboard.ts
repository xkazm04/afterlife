'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { planBatch, resolve as resolveRun, runBatch } from '../model/batch';
import { initialRuns, type OnboardData } from '../model/build';
import { baseline, byGroup, funnel, type Step } from '../model/funnel';

export const BATCH_SIZES = ['5', '10', '20'] as const;
export type BatchSize = (typeof BATCH_SIZES)[number];

/** The first MR number a simulated batch opens (the demo group's MRs run below it). */
const FIRST_MR = 60;

/**
 * The Onboard screen state: where every project stands (simulated runs move it), the batch size and scope (a
 * group, or the estate), what is selected, the step filter and the preview sheet. Nothing is written: a run is simulated and says so.
 */
export function useOnboard(data: OnboardData) {
  const { status } = useToast();
  const [runs, setRuns] = useState(() => initialRuns(data));
  const [nextMr, setNextMr] = useState(FIRST_MR);
  const [size, setSize] = useState<BatchSize>('5');
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Step | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  const steps = useMemo(() => Object.fromEntries(Object.entries(runs).map(([id, r]) => [id, r.step])) as Record<string, Step>, [runs]);
  const counts = useMemo(() => funnel(steps), [steps]);
  const groups = useMemo(() => byGroup(data.projects, data.groups, steps), [data, steps]);
  const base = useMemo(() => baseline(data.projects.filter((p) => steps[p.id] !== 'discovered')), [data, steps]);
  // A picked group scopes the reads and writes (onboard one group at a time if you like); what only you can do is
  // always listed for the whole estate.
  const batch = useMemo(
    () => planBatch(data.projects, runs, Number(size), data.org, group ? (p) => p.group === group : undefined),
    [data, runs, size, group],
  );
  const byId = useMemo(() => new Map(data.projects.map((p) => [p.id, p])), [data]);

  const run = () => {
    const r = runBatch(runs, batch, data.projects, nextMr, data.org);
    setRuns(r.runs);
    setNextMr(r.nextMr);
    setSheet(false);
    const mrs = r.nextMr - nextMr;
    status(`Simulated: ${batch.reads.length} read${batch.reads.length === 1 ? '' : 's'} landed · ${mrs} MR${mrs === 1 ? '' : 's'} opened as you, each waits for your merge`);
  };

  /** A person did their part; the (simulated) probe confirms it and the project moves on. */
  const resolve = (id: string) => {
    const p = byId.get(id);
    if (!p) return;
    setRuns((r) => resolveRun(r, id, p, data.org));
    status(`Simulated probe: ${p.name} moves on`);
  };

  return { runs, steps, counts, groups, base, batch, byId, size, setSize, selected, setSelected, filter, setFilter, group, setGroup, sheet, setSheet, run, resolve };
}

export type OnboardApi = ReturnType<typeof useOnboard>;
