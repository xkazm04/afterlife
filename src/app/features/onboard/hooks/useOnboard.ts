'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/overlays/toast/useToast';
import { nextAction, planBatch, resolve as resolveRun, runBatch, type OnboardIntent } from '../model/batch';
import { initialRuns, type OnboardData } from '../model/build';
import { baseline, byGroup, funnel, type Step } from '../model/funnel';
import { useOnboardWrites } from './useOnboardWrites';

export const BATCH_SIZES = ['5', '10', '20'] as const;
export type BatchSize = (typeof BATCH_SIZES)[number];

/**
 * The Onboard screen state: where every project stands (simulated runs move it), the batch size and scope (a
 * group, or the estate), what is selected, the step filter and the preview sheet. Reads are simulated and say so; a write
 * is the server's preview, confirmed on Run (demo mode simulates it server side), and only a confirmed one moves.
 */
export function useOnboard(data: OnboardData, startPreview = false) {
  const { status } = useToast();
  const [runs, setRuns] = useState(() => initialRuns(data));
  const writes = useOnboardWrites();
  const [running, setRunning] = useState(false);
  const [size, setSize] = useState<BatchSize>('5');
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Step | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [sheet, setSheet] = useState(startPreview);

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

  const run = async () => {
    if (running) return;
    setRunning(true);
    const intents = batch.writes.flatMap((id): OnboardIntent[] => {
      const p = byId.get(id);
      const r = runs[id];
      const i = p && r ? nextAction(p, r, data.org)?.intent : undefined;
      return i ? [i] : [];
    });
    try {
      const { opened, notSent } = await writes.sendAll(intents);
      setRuns((cur) => runBatch(cur, batch, data.projects, data.org, opened));
      setSheet(false);
      const mrs = Object.keys(opened).length;
      const reads = `Simulated: ${batch.reads.length} read${batch.reads.length === 1 ? '' : 's'} landed`;
      const sent = `${mrs} write${mrs === 1 ? '' : 's'} confirmed as you, each waits for your merge`;
      status(`${reads} · ${sent}${notSent.length ? ` · ${notSent.length} not sent: ${notSent[0]}` : ''}`);
    } finally {
      setRunning(false);
    }
  };

  /** A person did their part; the (simulated) probe confirms it and the project moves on. */
  const resolve = (id: string) => {
    const p = byId.get(id);
    if (!p) return;
    setRuns((r) => resolveRun(r, id, p, data.org));
    status(`Simulated probe: ${p.name} moves on`);
  };

  return { runs, writes, running, steps, counts, groups, base, batch, byId, size, setSize, selected, setSelected, filter, setFilter, group, setGroup, sheet, setSheet, run, resolve };
}

export type OnboardApi = ReturnType<typeof useOnboard>;
