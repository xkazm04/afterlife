// The runner's output, read off disk: <root>/runs/<repo>/<wave>.jsonl (belay.run/0, one event per line) and the
// optional <wave>.proposals.md beside it. Real local data in demo and live alike, so it is its own module, not the
// DataSource. A line that is not a valid event is skipped and COUNTED; a missing directory is simply no runs.
import 'server-only';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { foldRuns, foldWave } from '@/lib/runs/fold';
import { parseRunLine } from '@/lib/runs/parse';
import type { RunWave, RunsData } from '@/lib/runs/types';
import type { RunEvent } from '@/schemas/run/run';

export const defaultRunsRoot = (): string => process.env.BELAY_DATA_DIR ?? '.belay';

const dirs = (p: string): string[] => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

// A parsed wave file is kept by path and re-used while its mtime and size are unchanged, so a 2 s poll re-reads only
// the file the runner is appending to. Skipped lines are cached with the events, so the count stays exact.
interface ParsedFile {
  mtimeMs: number;
  size: number;
  events: RunEvent[];
  skipped: number;
}
const parsedFiles = new Map<string, ParsedFile>();

/** The events of one wave file, or undefined when it cannot be read (counted as one skipped by the caller). */
function readWaveFile(path: string): ParsedFile | undefined {
  let st;
  try {
    st = statSync(path);
  } catch {
    parsedFiles.delete(path);
    return undefined;
  }
  const hit = parsedFiles.get(path);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    parsedFiles.delete(path);
    return undefined;
  }
  const events: RunEvent[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const e = parseRunLine(line);
    if (e) events.push(e);
    else skipped += 1;
  }
  const parsed = { mtimeMs: st.mtimeMs, size: st.size, events, skipped };
  parsedFiles.set(path, parsed);
  return parsed;
}

/** `onWave` is handed each folded wave with its events, so a caller that needs them (the live meta) never re-reads the file. */
export function readRuns(root: string = defaultRunsRoot(), onWave?: (w: RunWave, events: RunEvent[]) => void): RunsData {
  const base = join(root, 'runs');
  const waves: RunWave[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const repo of dirs(base)) {
    const dir = join(base, repo);
    const files = readdirSync(dir);
    for (const f of files.filter((n) => n.endsWith('.jsonl'))) {
      const path = join(dir, f);
      seen.add(path);
      const parsed = readWaveFile(path);
      if (!parsed) {
        skipped += 1;
        continue;
      }
      skipped += parsed.skipped;
      const w = foldWave(parsed.events, files.includes(`${f.slice(0, -'.jsonl'.length)}.proposals.md`));
      if (w) {
        waves.push(w);
        onWave?.(w, parsed.events);
      }
    }
  }
  // Forget files of this root that are gone, so the cache cannot grow past what is on disk.
  for (const k of parsedFiles.keys()) if (k.startsWith(base) && !seen.has(k)) parsedFiles.delete(k);
  return foldRuns(waves, skipped);
}
