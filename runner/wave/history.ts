// What earlier waves of a repo did, read back from its run files: one line per lane, `wave <n>: <title> ->
// <outcome>`. The planner gets these so wave n+1 does not re-plan what wave n already landed. A lane lands on the
// wave branch, not on base: a person takes or drops it. Given base's commit subjects, a landed lane whose commit
// (`belay(wave-<n>): <title>`, kept by a fast-forward or a cherry-pick) is not in base says so, so a lane the
// reviewer rejected is not read as done.
import fs from 'node:fs';
import path from 'node:path';

export function waveHistory(runsDir: string, repo: string, baseSubjects?: ReadonlySet<string>): string[] {
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
        const n = parseInt(f, 10);
        const title = titles.get(e.lane) ?? e.lane;
        const dropped = e.outcome === 'landed' && baseSubjects !== undefined && !baseSubjects.has(`belay(wave-${n}): ${title}`);
        out.push(`wave ${n}: ${title} -> ${dropped ? 'landed on its wave branch but NOT taken into base (rejected, or not merged yet)' : String(e.outcome)}${why}`);
      }
    }
    out.push(...reviewNotes(dir, parseInt(f, 10)));
  }
  return out;
}

/**
 * A reviewer's verdicts on a wave, `<repo>/<wave>.review.md` beside its run file: one non-empty line per verdict, e.g.
 * `rejected resolve-prune-error-keeps-result: the prune error still wins; the gain is cosmetic`. The run file only says
 * a lane landed; this is why its reviewer took it or not, so the next planner does not re-plan a rejected premise.
 */
function reviewNotes(dir: string, wave: number): string[] {
  let text = '';
  try {
    text = fs.readFileSync(path.join(dir, `${wave}.review.md`), 'utf8');
  } catch {
    return [];
  }
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*]\s*/, '').trim())
    .filter((l) => l && !l.startsWith('#'))
    .slice(0, 12)
    .map((l) => `wave ${wave} review: ${l.slice(0, 240)}`);
}
