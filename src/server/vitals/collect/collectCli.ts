// `belay collect --project <slug>`: run by cli/belay.mjs through tsx. Reads CI runs through the person's own CLI login,
// read-only, and appends the new ones under <data>/vitals/<slug>/. Exit 1 when a provider failed, 2 on bad usage.
import { collectProject } from './collect';

async function main(argv: string[]): Promise<number> {
  const i = argv.indexOf('--project');
  const slug = i >= 0 ? argv[i + 1] : undefined;
  if (!slug || slug.startsWith('--')) {
    process.stderr.write('usage: belay collect --project <slug>\n');
    return 2;
  }
  try {
    const r = await collectProject(slug);
    process.stdout.write(`${r.slug}: ${r.ci.added} new CI run${r.ci.added === 1 ? '' : 's'} (${r.ci.total} stored)\n`);
    for (const p of r.probes) process.stderr.write(`${p.kind} ${p.status}: ${p.summary}\n`);
    return r.probes.some((p) => p.status === 'fail') ? 1 : 0;
  } catch (err) {
    process.stderr.write(`belay collect: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
