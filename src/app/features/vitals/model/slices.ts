// Vitals' slices as the screen host hands them to the client (screen/slices.ts streams them), folded into what the two
// screens draw: a whole view with each band's part marked pending until its slice is read. A pending part is drawn as
// a dash, never as its placeholder (an empty band, zero runs). Pure.
import type { SliceState } from '@/components/shell/host';
import type { AdjustmentRow, CollectJob, ProjectRow, RunsCell, SignalRow, VitalsCi, VitalsConfig, VitalsView } from './types';

/** true: not read yet; a string: why it could not be read ('not-local': the request was not this machine's). */
export type Pending = true | string;

export type VitalsPart = 'config' | 'job' | 'ci' | 'prod' | 'adjustments';
export type VitalsPending = Partial<Record<VitalsPart, Pending>>;

export interface VitalsSlices {
  config: SliceState<VitalsConfig & { now: string }>;
  job: SliceState<{ job?: CollectJob }>;
  ci: SliceState<VitalsCi>;
  prod: SliceState<{ production?: SignalRow[] }>;
  adjustments: SliceState<{ adjustments: AdjustmentRow[] }>;
}

/** /vitals's slices. */
export interface ListSlices {
  config: SliceState<{ projects: ProjectRow[] }>;
  runs: SliceState<{ now: string; bySlug: Record<string, RunsCell> }>;
}

/** A slice not read: pending (true, or its failure); read: undefined. */
export const pendingOf = (s: SliceState<unknown>): Pending | undefined => (s.state === 'ok' ? undefined : s.state === 'error' ? s.reason : true);

/** The project page from its slices: every part read so far, the rest marked pending (and held as an empty placeholder). */
export function vitalsView(slug: string, s: VitalsSlices): { view: VitalsView; pending: VitalsPending } {
  const config = s.config.state === 'ok' ? s.config.data : undefined;
  const ci = s.ci.state === 'ok' ? s.ci.data : undefined;
  const view: VitalsView = {
    slug,
    name: config?.name ?? slug,
    root: config?.root ?? '',
    host: config?.host ?? '',
    ci: config?.ci ?? '',
    cloud: config?.cloud ?? { provider: 'none' },
    runsStored: ci?.runsStored ?? 0,
    delivery: ci?.delivery ?? [],
    adjustments: s.adjustments.state === 'ok' ? s.adjustments.data.adjustments : [],
    now: config?.now ?? '',
  };
  if (ci?.lastCollected) view.lastCollected = ci.lastCollected;
  if (s.prod.state === 'ok' && s.prod.data.production) view.production = s.prod.data.production;
  if (s.job.state === 'ok' && s.job.data.job) view.job = s.job.data.job;
  const pending: VitalsPending = {};
  for (const k of ['config', 'job', 'ci', 'prod', 'adjustments'] as const) {
    const p = pendingOf(s[k]);
    if (p !== undefined) pending[k] = p;
  }
  return { view, pending };
}

/** A list row with what its runs say: absent while the runs slice is not read (its cells are dashes). */
export interface ListRow extends ProjectRow {
  runs?: RunsCell;
}

/** The /vitals rows: each config row with its runs cell once read. */
export function listRows(projects: readonly ProjectRow[], bySlug: Readonly<Record<string, RunsCell>> | undefined): ListRow[] {
  return projects.map((p) => {
    const runs = bySlug?.[p.slug];
    return runs ? { ...p, runs } : { ...p };
  });
}
