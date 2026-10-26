// Which projects Vitals shows: the saved (real) ones always, and while the demo estate is on (lib/settings/demoEstate,
// 'auto' while no real project is saved) the demo projects after them, each marked `demo`. A real project always wins
// its slug: a demo project whose slug a saved one has is not shown. Pure: the loader reads the setting and the configs.
import type { ProjectConfig } from '@/schemas/vitals';
import type { AdjustmentRow } from '../types';
import { DEMO_PROJECTS } from './projects';

/** A project Vitals shows, and whether it is one of the demo estate's (its figures generated, never collected). */
export interface Shown {
  cfg: ProjectConfig;
  demo: boolean;
}

export function shownProjects(real: readonly ProjectConfig[], demo: boolean): Shown[] {
  const saved = new Set(real.map((p) => p.slug));
  const out: Shown[] = real.map((cfg) => ({ cfg, demo: false }));
  if (demo) for (const cfg of DEMO_PROJECTS) if (!saved.has(cfg.slug)) out.push({ cfg, demo: true });
  return out;
}

/** The shown project with this slug, or null (the page answers notFound). */
export function shownProject(real: readonly ProjectConfig[], demo: boolean, slug: string): Shown | null {
  return shownProjects(real, demo).find((p) => p.cfg.slug === slug) ?? null;
}

/** The clock a demo project's figures are generated from: now to the minute, so its slices of one read agree. */
export const demoClock = (ms: number): number => Math.floor(ms / 60_000) * 60_000;

/** A demo row offers no re-measure: nothing was collected, so there is nothing Afterlife could measure it against. */
export function withoutRemeasure(rows: readonly AdjustmentRow[]): AdjustmentRow[] {
  return rows.map((row) => {
    if (!row.remeasure) return row;
    const out = { ...row };
    delete out.remeasure;
    return out;
  });
}
