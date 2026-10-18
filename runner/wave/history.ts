// What earlier waves of a repo did, read back from its run files: one line per lane, `wave <n>: <title> ->
// <outcome>`. The planner gets these so wave n+1 does not re-plan what wave n already landed.
import fs from 'node:fs';
import path from 'node:path';

export function waveHistory(runsDir: string, repo: string): string[] {
  const dir = path.join(runsDir, repo);
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const files = fs.readdirSync(dir).filter((f) => /^\d+\.jsonl$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  for (const f of files) {
    const titles = new Map<string, string>();
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      let e: Record<string, unknown>;
      try {
        e = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (e.kind === 'lane.start' && typeof e.lane === 'string') titles.set(e.lane, String(e.title ?? e.lane));
      if (e.kind === 'lane.end' && typeof e.lane === 'string') {
        const why = typeof e.parkReason === 'string' ? ` (${e.parkReason.slice(0, 120)})` : '';
        out.push(`wave ${parseInt(f, 10)}: ${titles.get(e.lane) ?? e.lane} -> ${String(e.outcome)}${why}`);
      }
    }
  }
  return out;
}
