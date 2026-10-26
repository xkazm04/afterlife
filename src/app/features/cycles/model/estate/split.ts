// The estate as the screen stream sends it: the groups and their numbers first (`estate`, light), every project's
// closed cycles after (`estateCycles`, the heavy part, read only by the inspector's "Every cycle"). Pure.
import type { Cycle } from '../types';
import type { EstateData, EstateGroup, EstateProject } from './estate';

/** A project row without its cycles. */
export type EstateRow = Omit<EstateProject, 'cycles'>;
export type EstateSummary = Omit<EstateData, 'groups'> & { groups: (Omit<EstateGroup, 'projects'> & { projects: EstateRow[] })[] };
/** Each project's closed cycles, by project id. */
export type EstateCycles = Readonly<Record<string, readonly Cycle[]>>;

/** The estate without the projects' cycles. */
export function estateSummary(d: EstateData): EstateSummary {
  return {
    ...d,
    groups: d.groups.map((g) => ({
      ...g,
      projects: g.projects.map((p) => {
        const row: EstateRow & { cycles?: unknown } = { ...p };
        delete row.cycles;
        return row;
      }),
    })),
  };
}

/** The projects' cycles alone. */
export const estateCycles = (d: EstateData): EstateCycles => Object.fromEntries(d.groups.flatMap((g) => g.projects.map((p) => [p.id, p.cycles])));

/** A slice answer is the estate (scope=estate) and not the empty answer the project scope gets. */
export const isEstateSummary = (v: unknown): v is EstateSummary => typeof v === 'object' && v !== null && Array.isArray((v as { groups?: unknown }).groups);
