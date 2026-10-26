// <data dir>/fleet.yml as the screens read it: each repo's slug, path, base and (optional) GitLab path. The runner's own
// loader (runner/fleet) is the strict one and owns the gates and caps; this reader only names the repos, and says why
// when it cannot.
import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { FleetFile, FleetRef } from '@/lib/runs/desk/types';
import { fleetRefProblem } from '../../../runner/fleet/names';

export interface FleetRead {
  file: FleetFile;
  refs: FleetRef[];
  error?: string;
}

const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function readFleet(root: string): FleetRead {
  const file = join(root, 'fleet.yml');
  if (!existsSync(file)) return { file: 'missing', refs: [] };
  try {
    const doc: unknown = parse(readFileSync(file, 'utf8'));
    const repos = (doc as { repos?: unknown } | null)?.repos;
    if (!Array.isArray(repos)) return { file: 'invalid', refs: [], error: 'no "repos" list' };
    const refs: FleetRef[] = [];
    for (const [i, r] of repos.entries()) {
      const { slug, path, base, gitlab } = (r ?? {}) as Record<string, unknown>;
      if (!str(slug) || !str(path) || !str(base)) return { file: 'invalid', refs: [], error: `repos[${i}] needs slug, path and base` };
      const problem = fleetRefProblem(slug, base); // the runner's own rule: a file it refuses is not ok here
      if (problem) return { file: 'invalid', refs: [], error: `repos[${i}]: ${problem}` };
      // the runner refuses a repeated slug (runner/fleet/load.ts), so the screens do not call that file ok
      if (refs.some((x) => x.slug === slug)) return { file: 'invalid', refs: [], error: `repos[${i}]: duplicate slug "${slug}"` };
      refs.push({ slug, path, base, ...(str(gitlab) ? { gitlab } : {}) }); // gitlab: optional, the cost join's key
    }
    return { file: 'ok', refs };
  } catch (e) {
    return { file: 'invalid', refs: [], error: e instanceof Error ? e.message.split('\n')[0] : 'unreadable' };
  }
}
