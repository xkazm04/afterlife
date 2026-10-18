// The runner's output, read off disk: <root>/runs/<repo>/<wave>.jsonl (belay.run/0, one event per line) and the
// optional <wave>.proposals.md beside it. Real local data in demo and live alike, so it is its own module, not the
// DataSource. A line that is not a valid event is skipped and COUNTED; a missing directory is simply no runs.
import 'server-only';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { foldRuns, foldWave } from '@/lib/runs/fold';
import { parseRunLine } from '@/lib/runs/parse';
import type { RunWave, RunsData } from '@/lib/runs/types';
import type { RunEvent } from '@/schemas/run/run';

export const defaultRunsRoot = (): string => process.env.BELAY_DATA_DIR ?? '.belay';

const dirs = (p: string): string[] => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

export function readRuns(root: string = defaultRunsRoot()): RunsData {
  const base = join(root, 'runs');
  const waves: RunWave[] = [];
  let skipped = 0;
  for (const repo of dirs(base)) {
    const dir = join(base, repo);
    const files = readdirSync(dir);
    for (const f of files.filter((n) => n.endsWith('.jsonl'))) {
      const events: RunEvent[] = [];
      let text: string;
      try {
        text = readFileSync(join(dir, f), 'utf8');
      } catch {
        skipped += 1;
        continue;
      }
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const e = parseRunLine(line);
        if (e) events.push(e);
        else skipped += 1;
      }
      const w = foldWave(events, files.includes(`${f.slice(0, -'.jsonl'.length)}.proposals.md`));
      if (w) waves.push(w);
    }
  }
  return foldRuns(waves, skipped);
}
