// .belay/fleet.yml as the screens read it: each repo's slug, path and base. The runner's own loader (runner/fleet) is
// the strict one and owns the gates and caps; this reader only names the repos, and says why when it cannot.
import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { FleetFile, FleetRef } from '@/lib/runs/desk/types';

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
      const { slug, path, base } = (r ?? {}) as Record<string, unknown>;
      if (!str(slug) || !str(path) || !str(base)) return { file: 'invalid', refs: [], error: `repos[${i}] needs slug, path and base` };
      refs.push({ slug, path, base });
    }
    return { file: 'ok', refs };
  } catch (e) {
    return { file: 'invalid', refs: [], error: e instanceof Error ? e.message.split('\n')[0] : 'unreadable' };
  }
}
