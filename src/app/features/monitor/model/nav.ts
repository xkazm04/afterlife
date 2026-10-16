// Arrow-key movement over the leads: pure, so the empty-group edges can be tested. Components only call it.
import type { Lead } from './types';

/** The next beat for an arrow key: along the lead, or the same place on the nearest lead above or below that has any. */
export function step(leads: readonly Pick<Lead, 'projects'>[], id: string | null, key: string): string | null {
  const li = leads.findIndex((l) => l.projects.some((p) => p.id === id));
  const here = leads[li];
  if (!here) return leads.find((l) => l.projects.length)?.projects[0]?.id ?? null;
  const list = here.projects;
  const i = list.findIndex((p) => p.id === id);
  if (key === 'ArrowLeft') return list[Math.max(0, i - 1)]?.id ?? id;
  if (key === 'ArrowRight') return list[Math.min(list.length - 1, i + 1)]?.id ?? id;
  const dir = key === 'ArrowUp' ? -1 : 1;
  let j = li + dir;
  while (leads[j] && !leads[j]!.projects.length) j += dir;
  const to = leads[j]?.projects;
  if (!to?.length) return id;
  return to[Math.min(to.length - 1, Math.round((i / Math.max(1, list.length - 1)) * (to.length - 1)))]?.id ?? id;
}
