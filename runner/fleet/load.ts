// .belay/fleet.yml -> FleetRepo[]: the repos the runner may work, each with the gates that must be green
// before anything is committed. Strict on purpose - a typo in a gate list must stop the run, not skip a gate.
import fs from 'node:fs';
import { parse } from 'yaml';
import type { FleetRepo } from '../index';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Two or more plain argv words: `npx vitest run`, `cargo check`. */
const LANE_TOOL = /^[A-Za-z0-9][A-Za-z0-9@%+=:,./_-]*( [A-Za-z0-9@%+=:,./_-]+)+$/;

function cap(v: unknown, where: string, key: string): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !(v > 0)) throw new Error(`${where}: ${key} must be a positive number`);
  return v;
}

export function parseFleet(text: string, file: string): FleetRepo[] {
  const doc: unknown = parse(text);
  const repos = isObj(doc) ? doc.repos : undefined;
  if (!Array.isArray(repos) || repos.length === 0) throw new Error(`${file}: expected a non-empty "repos" list`);
  const seen = new Set<string>();
  return repos.map((r: unknown, i): FleetRepo => {
    const where = `${file}: repos[${i}]`;
    if (!isObj(r)) throw new Error(`${where} must be a mapping`);
    const { slug, path, base, gates } = r;
    if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(slug)) throw new Error(`${where}: slug must be a lowercase token`);
    if (seen.has(slug)) throw new Error(`${where}: duplicate slug "${slug}"`);
    seen.add(slug);
    if (typeof path !== 'string' || !path) throw new Error(`${where}: path is required`);
    // base reaches git argv (rev-parse, worktree add): a leading '-' would be read as an option.
    if (typeof base !== 'string' || !/^[A-Za-z0-9_][A-Za-z0-9._/~^@{}-]*$/.test(base)) throw new Error(`${where}: base must be a git ref or sha`);
    if (!Array.isArray(gates) || gates.length === 0 || !gates.every((g) => typeof g === 'string' && g.trim())) {
      throw new Error(`${where}: gates must be a non-empty list of commands`);
    }
    const { setup } = r;
    if (setup !== undefined && (!Array.isArray(setup) || !setup.every((g) => typeof g === 'string' && g.trim()))) {
      throw new Error(`${where}: setup must be a list of commands`);
    }
    const { laneTools } = r;
    // Each becomes an allow rule `Bash(<prefix>:*)` in the lane's settings: plain words only, never a bare launcher.
    if (laneTools !== undefined && (!Array.isArray(laneTools) || !laneTools.every((t) => typeof t === 'string' && LANE_TOOL.test(t.trim())))) {
      throw new Error(`${where}: laneTools must be a list of command prefixes of two or more plain words`);
    }
    const laneCapUsd = cap(r.laneCapUsd, where, 'laneCapUsd');
    const waveCapUsd = cap(r.waveCapUsd, where, 'waveCapUsd');
    return { slug, path, base, gates: gates as string[], ...(setup?.length ? { setup: setup as string[] } : {}), ...(laneTools?.length ? { laneTools: (laneTools as string[]).map((t) => t.trim()) } : {}), ...(laneCapUsd ? { laneCapUsd } : {}), ...(waveCapUsd ? { waveCapUsd } : {}) };
  });
}

export function loadFleet(file: string): FleetRepo[] {
  return parseFleet(fs.readFileSync(file, 'utf8'), file);
}
