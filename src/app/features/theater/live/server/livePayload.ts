// Server side of the live film: readRuns()'s data plus the per-wave meta the fold drops. Only each repo's newest wave is
// re-read (it is the one that can be running); the parser is the runs feature's own, so a bad line is skipped the same way.
import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRunLine } from '@/app/features/runs/model/parse';
import { defaultRunsRoot, readRuns } from '@/server/runs/readRuns';
import type { RunEvent } from '@/schemas/run/run';
import { waveMetaOf } from '../model/meta';
import { waveKey, type LivePayload } from '../model/types';

export function loadLivePayload(root: string = defaultRunsRoot()): LivePayload {
  const runs = readRuns(root);
  const meta: LivePayload['meta'] = {};
  for (const r of runs.repos) {
    const w = r.waves[0];
    if (!w) continue;
    try {
      const events = readFileSync(join(root, 'runs', w.repo, `${w.wave}.jsonl`), 'utf8')
        .split(/\r?\n/)
        .map((l) => (l.trim() ? parseRunLine(l) : null))
        .filter((e): e is RunEvent => e !== null);
      const m = waveMetaOf(events);
      if (m) meta[waveKey(w.repo, w.wave)] = m;
    } catch {
      /* the file went away between the two reads: no meta, the frame degrades to what the fold knows */
    }
  }
  return { ...runs, meta, generatedAt: Date.now() };
}
