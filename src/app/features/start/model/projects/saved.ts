// The projects /start lists: the ones saved on this machine (<data>/projects/<slug>.yml, discover's loadProjects, the
// same files Vitals reads), as the projects slice carries them, and which one the URL selects. Pure. A saved project is
// the person's own whatever the server's mode: the demo estate is invented and never written there, so the list holds
// only what this machine's wizard saved (none on a fresh machine), never a demo project.
import type { Host, ProbeResult, ProjectConfig, Proposal } from '@/schemas/vitals';
import { checklist, tally, type Group } from '../stack/lines';

/** One saved project as the screen reads it: who it is, and its saved lines in the checklist's own shape. */
export interface SavedProject {
  slug: string;
  name: string;
  /** Absolute git toplevel. */
  root: string;
  /** ISO instant it was saved. */
  onboardedAt: string;
  host: Host;
  /** The saved config in a proposal's shape (what was watched), so the stack step reads it as the wizard's checklist. */
  proposal: Proposal;
  /** The probe results the save kept: what confirmed each line, at onboarding. */
  results: ProbeResult[];
}

/** The projects slice's data: the rows, and why they are none or partial. */
export interface ProjectsRead {
  projects: SavedProject[];
  note?: string;
}

/** The same words wherever the list cannot be read. */
export const projectsNote = {
  notLocal: 'Saved projects are listed only on this machine: open Afterlife on localhost.',
  failed: (why: string) => `The saved projects could not be read (${why}).`,
  none: 'None saved on this machine yet.',
};

export function savedOf(cfg: ProjectConfig): SavedProject {
  const { resource, logs } = cfg.cloud;
  const hint = { resourceGroup: resource?.resourceGroup ?? logs?.resourceGroup, name: resource?.name ?? logs?.name, site: logs?.site };
  const proposal: Proposal = {
    name: cfg.name,
    host: cfg.host,
    components: cfg.components,
    ci: cfg.ci,
    cloud: { provider: cfg.cloud.provider, hint },
    metrics: cfg.runner?.frontier?.metrics ?? [],
    probes: cfg.probes.map(({ kind, args }) => ({ kind, args })),
  };
  return { slug: cfg.slug, name: cfg.name, root: cfg.root, onboardedAt: cfg.onboardedAt, host: cfg.host, proposal, results: cfg.probes };
}

/** The list as the sidebar draws it: rows undefined while unread (a dash, never "none"); a refusal or a failure is a note. */
export function projectsOf(s: { state: 'unread' } | { state: 'ok'; data: ProjectsRead } | { state: 'error'; reason: string }): { projects?: readonly SavedProject[]; note?: string } {
  if (s.state === 'unread') return {};
  if (s.state === 'error') return { projects: [], note: s.reason === 'not-local' ? projectsNote.notLocal : projectsNote.failed(s.reason) };
  return s.data.note ? { projects: s.data.projects, note: s.data.note } : { projects: s.data.projects };
}

/** The query key that selects a saved project: /start?project=<slug>. Bare /start (or ?add=1) is adding a new one. */
export const PROJECT_PARAM = 'project';
export const projectHref = (slug: string): string => `/start?${PROJECT_PARAM}=${encodeURIComponent(slug)}`;
/** Adding, said in the URL: a bare /start link from another screen returns to the query /start was left with. */
export const ADD_HREF = '/start?add=1';

export type Selection =
  | { kind: 'add' }
  | { kind: 'saved'; project: SavedProject }
  /** A slug in the URL while the list is not read yet. */
  | { kind: 'reading'; slug: string }
  /** A slug no saved project has (deleted, or a link from another machine). */
  | { kind: 'missing'; slug: string };

export function selectionOf(search: URLSearchParams, projects: readonly SavedProject[] | undefined): Selection {
  const slug = search.get(PROJECT_PARAM)?.trim();
  if (!slug) return { kind: 'add' };
  if (!projects) return { kind: 'reading', slug };
  const project = projects.find((p) => p.slug === slug);
  return project ? { kind: 'saved', project } : { kind: 'missing', slug };
}

/** "2026-10-21": the day it was saved, as written (the server's and the browser's render agree). */
export const savedDay = (iso: string): string => (/^\d{4}-\d{2}-\d{2}/.exec(iso)?.[0] ?? iso);

/** The saved lines as the stack step's checklist, each with the probe that confirmed it at onboarding. */
export function savedStack(p: SavedProject): { groups: Group[]; tally: ReturnType<typeof tally> } {
  const groups = checklist(p.proposal, p.results, null);
  return { groups, tally: tally(groups) };
}
