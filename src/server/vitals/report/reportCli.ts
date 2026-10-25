// `belay report --project <slug> --claim '<json>' | --claim <file>`: run by cli/belay.mjs through tsx. A dev agent's
// claim that its change moves a CI stage, a run, a local metric or a prod signal, validated strictly (claim.ts), filled
// with `id` and `at`, appended to <data>/vitals/<slug>/adjustments.jsonl and printed as the line it wrote. Afterlife
// re-measures it later; the agent's number is never the verdict. Exit 2 for bad usage or an invalid claim, with why.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadProjects } from '@/server/discover';
import { appendAdjustment } from '../store';
import { parseClaim } from './claim';

const USAGE = "usage: belay report --project <slug> --claim '<json>' | --claim <file.json>";

const flag = (argv: string[], name: string): string | undefined => {
  const i = argv.indexOf(name);
  const v = i >= 0 ? argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : undefined;
};

/** The claim text: inline JSON, or a file read from the caller's directory (belay.mjs passes it as BELAY_CALLER_CWD). */
function claimText(v: string): string {
  if (v.trim().startsWith('{')) return v;
  const file = path.resolve(process.env.BELAY_CALLER_CWD ?? process.cwd(), v.replace(/^\$/, ''));
  return readFileSync(file, 'utf8');
}

export function report(argv: string[], out: (s: string) => void, err: (s: string) => void): number {
  const slug = flag(argv, '--project');
  const raw = flag(argv, '--claim');
  if (!slug || !raw) return err(`${USAGE}\n`), 2;
  const cfg = loadProjects().find((p) => p.slug === slug);
  if (!cfg) return err(`belay report: no onboarded project "${slug}" (open /onboard in Afterlife first)\n`), 2;
  let json: unknown;
  try {
    json = JSON.parse(claimText(raw));
  } catch (e) {
    return err(`belay report: the claim is not readable JSON: ${e instanceof Error ? e.message : String(e)}\n`), 2;
  }
  const p = parseClaim(json, { cfg });
  if (!p.ok) return err(`belay report: refused: ${p.reason}\n`), 2;
  appendAdjustment(slug, p.claim);
  out(`${JSON.stringify(p.claim)}\n`);
  return 0;
}

if (process.argv[1] && /reportCli\.ts$/.test(process.argv[1])) {
  process.exitCode = report(process.argv.slice(2), (s) => process.stdout.write(s), (s) => process.stderr.write(s));
}
