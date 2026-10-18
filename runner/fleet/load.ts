// .belay/fleet.yml -> FleetRepo[]: the repos the runner may work, each with the gates that must be green
// before anything is committed. Strict on purpose - a typo in a gate list must stop the run, not skip a gate.
import fs from 'node:fs';
import { parse } from 'yaml';
import type { FleetRepo } from '../index';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

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
    if (typeof base !== 'string' || !base) throw new Error(`${where}: base is required`);
    if (!Array.isArray(gates) || gates.length === 0 || !gates.every((g) => typeof g === 'string' && g.trim())) {
      throw new Error(`${where}: gates must be a non-empty list of commands`);
    }
    const laneCapUsd = cap(r.laneCapUsd, where, 'laneCapUsd');
    const waveCapUsd = cap(r.waveCapUsd, where, 'waveCapUsd');
    return { slug, path, base, gates: gates as string[], ...(laneCapUsd ? { laneCapUsd } : {}), ...(waveCapUsd ? { waveCapUsd } : {}) };
  });
}

export function loadFleet(file: string): FleetRepo[] {
  return parseFleet(fs.readFileSync(file, 'utf8'), file);
}
