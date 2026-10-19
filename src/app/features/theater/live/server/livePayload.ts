// Server side of the live film: readRuns()'s data plus the per-wave meta the fold drops. Meta is built from the events
// readRuns already parsed (for each repo's newest wave, the one that can be running): the file is not read a second time.
import 'server-only';
import { defaultRunsRoot, readRuns } from '@/server/runs/readRuns';
import type { RunEvent } from '@/schemas/run/run';
import { waveMetaOf } from '../model/meta';
import { waveKey, type LivePayload } from '../model/types';

export function loadLivePayload(root: string = defaultRunsRoot()): LivePayload {
  const events = new Map<string, RunEvent[]>();
  const runs = readRuns(root, (w, e) => events.set(waveKey(w.repo, w.wave), e));
  const meta: LivePayload['meta'] = {};
  for (const r of runs.repos) {
    const w = r.waves[0];
    if (!w) continue;
    const key = waveKey(w.repo, w.wave);
    const m = waveMetaOf(events.get(key) ?? []);
    if (m) meta[key] = m;
  }
  return { ...runs, meta, generatedAt: Date.now() };
}
