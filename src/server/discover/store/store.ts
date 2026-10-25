// The projects Afterlife watches: one YAML file each at <data>/projects/<slug>.yml (gitignored, never in the project's own
// repo). A slug is the name in kebab case, unique against the files already there; re-onboarding a root keeps its slug,
// so a re-run replaces its own file instead of adding "grinex-portal-2". A file that does not parse as a project is
// skipped and counted, never thrown: one hand-edited file must not take the wizard and Vitals down with it.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import type { ProjectConfig } from '@/schemas/vitals';
import { rootKey } from '../repos/git';
import { isProjectConfig } from './valid';

export const dataRoot = (): string => process.env.BELAY_DATA_DIR ?? '.belay';
export const projectsDir = (): string => path.join(dataRoot(), 'projects');

/** "Grinex Portal" -> "grinex-portal"; nothing usable -> "project". */
export function kebab(name: string): string {
  const s = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
  return s || 'project';
}

/** The first of `base`, `base-2`, `base-3`, ... not in `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export interface LoadReport {
  projects: ProjectConfig[];
  /** Files that did not parse as a project, by name. */
  skipped: string[];
}

export function loadProjectsReport(dir = projectsDir()): LoadReport {
  if (!existsSync(dir)) return { projects: [], skipped: [] };
  const projects: ProjectConfig[] = [];
  const skipped: string[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.yml')).sort()) {
    try {
      const v: unknown = parse(readFileSync(path.join(dir, f), 'utf8'));
      if (isProjectConfig(v) && `${v.slug}.yml` === f) projects.push(v);
      else skipped.push(f);
    } catch {
      skipped.push(f);
    }
  }
  return { projects: projects.sort((a, b) => a.name.localeCompare(b.name)), skipped };
}

export function loadProjects(): ProjectConfig[] {
  const r = loadProjectsReport();
  if (r.skipped.length) console.warn(`belay: ${r.skipped.length} project file(s) skipped, not a valid project: ${r.skipped.join(', ')}`);
  return r.projects;
}

/** Writes the project (temp file, then rename) and returns its slug: the root's own when it was onboarded before. */
export function saveProject(cfg: ProjectConfig): string {
  const dir = projectsDir();
  mkdirSync(dir, { recursive: true });
  const { projects } = loadProjectsReport(dir);
  const mine = projects.find((p) => rootKey(p.root) === rootKey(cfg.root));
  const taken = new Set(readdirSync(dir).filter((n) => n.endsWith('.yml')).map((n) => n.slice(0, -4)));
  const slug = mine?.slug ?? uniqueSlug(kebab(cfg.name), taken);
  const file = path.join(dir, `${slug}.yml`);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, stringify({ ...cfg, slug }, { lineWidth: 0 }));
  renameSync(tmp, file);
  return slug;
}
