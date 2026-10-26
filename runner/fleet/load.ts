// <data>/fleet.yml (.afterlife, or an existing .belay) -> FleetRepo[]: the repos the runner may work, each with the gates that must be green
// before anything is committed. Strict on purpose - a typo in a gate list must stop the run, not skip a gate.
// Saved projects (<data>/projects/*.yml) with a runner block join them (projects.ts), through the same checks.
import fs from 'node:fs';
import nodePath from 'node:path';
import { parse } from 'yaml';
import { envOf } from '../proc/env';
import type { FleetRepo } from '../index';
import { parseFrontier } from './frontier';
import { FLEET_BASE, FLEET_SLUG } from './names';
import { projectEntries, type ProjectReposOptions } from './projects';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Two or more plain argv words: `npx vitest run`, `cargo check`. */
const LANE_TOOL = /^[A-Za-z0-9][A-Za-z0-9@%+=:,./_-]*( [A-Za-z0-9@%+=:,./_-]+)+$/;

/** A GitLab path_with_namespace: slash-separated path segments, no leading or trailing slash. */
const GITLAB_PATH = /^[A-Za-z0-9_.][A-Za-z0-9_.-]*(\/[A-Za-z0-9_.][A-Za-z0-9_.-]*)*$/;

function cap(v: unknown, where: string, key: string): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !(v > 0)) throw new Error(`${where}: ${key} must be a positive number`);
  return v;
}

/** One repo entry, validated: shared by fleet.yml and a saved project's runner block (projects.ts). */
export function parseRepo(r: unknown, where: string, file: string): FleetRepo {
  if (!isObj(r)) throw new Error(`${where} must be a mapping`);
  const { slug, path, base, gates } = r;
  if (typeof slug !== 'string' || !FLEET_SLUG.test(slug)) throw new Error(`${where}: slug must be a lowercase token`);
  if (typeof path !== 'string' || !path) throw new Error(`${where}: path is required`);
  if (typeof base !== 'string' || !FLEET_BASE.test(base)) throw new Error(`${where}: base must be a git ref or sha`);
  if (!Array.isArray(gates) || gates.length === 0 || !gates.every((g) => typeof g === 'string' && g.trim())) {
    throw new Error(`${where}: gates must be a non-empty list of commands`);
  }
  const { setup } = r;
  if (setup !== undefined && (!Array.isArray(setup) || !setup.every((g) => typeof g === 'string' && g.trim()))) {
    throw new Error(`${where}: setup must be a list of commands`);
  }
  const { diffCheck } = r;
  if (diffCheck !== undefined && typeof diffCheck !== 'boolean') throw new Error(`${where}: diffCheck must be true or false`);
  const { laneTools } = r;
  // Each becomes an allow rule `Bash(<prefix>:*)` in the lane's settings: plain words only, never a bare launcher.
  if (laneTools !== undefined && (!Array.isArray(laneTools) || !laneTools.every((t) => typeof t === 'string' && LANE_TOOL.test(t.trim())))) {
    throw new Error(`${where}: laneTools must be a list of command prefixes of two or more plain words`);
  }
  const laneCapUsd = cap(r.laneCapUsd, where, 'laneCapUsd');
  const waveCapUsd = cap(r.waveCapUsd, where, 'waveCapUsd');
  const frontier = parseFrontier(r.frontier, where);
  const { gitlab } = r;
  // The repo's GitLab path_with_namespace, for the screens' cost join (src/lib/runs/desk/join.ts); the runner never reads it.
  if (gitlab !== undefined && (typeof gitlab !== 'string' || !GITLAB_PATH.test(gitlab))) throw new Error(`${where}: gitlab must be a project path like group/sub/project`);
  // A relative path means relative to the fleet file's own folder, not to wherever the runner happens to run from.
  const repoPath = nodePath.isAbsolute(path) ? path : nodePath.resolve(nodePath.dirname(file), path);
  return { slug, path: repoPath, base, gates: gates as string[], ...(setup?.length ? { setup: setup as string[] } : {}), ...(laneTools?.length ? { laneTools: (laneTools as string[]).map((t) => t.trim()) } : {}), ...(diffCheck ? { diffCheck: true } : {}), ...(laneCapUsd ? { laneCapUsd } : {}), ...(waveCapUsd ? { waveCapUsd } : {}), ...(frontier ? { frontier } : {}), ...(gitlab ? { gitlab: gitlab as string } : {}) };
}

export function parseFleet(text: string, file: string): FleetRepo[] {
  const doc: unknown = parse(text);
  const repos = isObj(doc) ? doc.repos : undefined;
  if (!Array.isArray(repos) || repos.length === 0) throw new Error(`${file}: expected a non-empty "repos" list`);
  const seen = new Set<string>();
  return repos.map((r: unknown, i): FleetRepo => {
    const where = `${file}: repos[${i}]`;
    const repo = parseRepo(r, where, file);
    if (seen.has(repo.slug)) throw new Error(`${where}: duplicate slug "${repo.slug}"`);
    seen.add(repo.slug);
    return repo;
  });
}

/**
 * fleet.yml's repos, then every saved project (<data>/projects/*.yml) whose `runner` block makes it workable
 * (projects.ts). fleet.yml wins a slug both name, with a warning. A missing fleet.yml is no repos only when a project
 * gives one; otherwise its error stands, as before.
 */
export function loadFleet(file: string, o: ProjectReposOptions = {}): FleetRepo[] {
  let fleet: FleetRepo[] = [];
  let missing: unknown = null;
  try {
    fleet = parseFleet(fs.readFileSync(file, 'utf8'), file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    missing = e;
  }
  const taken = new Set(fleet.map((r) => r.slug));
  const warn = o.warn ?? ((m: string) => console.warn(m));
  const extra = projectEntries({ dataDir: envOf(process.env, 'DATA_DIR') ?? nodePath.dirname(file), ...o, warn }).map((p) => parseRepo(p.entry, `${p.file}: runner`, p.file)).filter((r) => {
    if (!taken.has(r.slug)) return true;
    warn(`runner: ${r.slug} is in ${file} and is a saved project; ${file} wins`);
    return false;
  });
  if (missing && !extra.length) throw missing;
  return [...fleet, ...extra];
}
