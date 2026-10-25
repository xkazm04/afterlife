// npm run onboard:ab -- <path>: the onboarding proposal on both engines (sonnet 5.5 low, then haiku 5.5 low), one after
// the other so neither's wall time carries the other's load. Prints each engine's wall seconds, dropped probes and
// line counts, then how far they agree, and writes the whole report to <data>/onboard-ab/<ts>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Engine, Proposal } from '@/schemas/vitals';
import { AB_ENGINE, DEFAULT_ENGINE, proposeProject } from '../index';
import { gitOut } from '../repos/git';
import { dataRoot } from '../store/store';
import { agreement, componentPaths, grinexChecks, pipelineKeys, variantIds } from './agree';

interface Arm {
  engine: Engine;
  wallS: number;
  dropped?: number;
  proposal?: Proposal;
  error?: string;
}

async function arm(root: string, engine: Engine): Promise<Arm> {
  const t0 = Date.now();
  try {
    const r = await proposeProject(root, engine);
    return { engine, wallS: (Date.now() - t0) / 1000, dropped: r.dropped, proposal: r.proposal };
  } catch (e) {
    return { engine, wallS: (Date.now() - t0) / 1000, error: e instanceof Error ? e.message : String(e) };
  }
}

function print(a: Arm): void {
  const head = `${a.engine.model} · ${a.engine.effort} · ${a.wallS.toFixed(1)} s`;
  if (!a.proposal) return console.log(`${head}\n  failed: ${a.error}`);
  const p = a.proposal;
  const g = grinexChecks(p);
  console.log(head);
  console.log(`  dropped probes ${a.dropped} · probes ${p.probes.length} · components [${componentPaths(p).join(', ')}]`);
  console.log(`  pipelines [${pipelineKeys(p).join(', ')}] · variants [${variantIds(p).join(', ')}]`);
  console.log(`  cloud ${p.cloud.provider} ${JSON.stringify(p.cloud.hint ?? {})} · release-log ${g.releaseLog} · ${Object.entries(g.variants).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}

async function main(argv: string[]): Promise<number> {
  const target = argv.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('usage: npm run onboard:ab -- <path to a git checkout>');
    return 2;
  }
  const root = await gitOut(path.resolve(target), ['rev-parse', '--show-toplevel']);
  if (!root) {
    console.error(`onboard:ab: ${target} is not inside a git repository`);
    return 2;
  }
  const arms = [await arm(root, DEFAULT_ENGINE), await arm(root, AB_ENGINE)];
  arms.forEach(print);
  const [a, b] = arms;
  const agree = a?.proposal && b?.proposal ? agreement(a.proposal, b.proposal) : undefined;
  if (agree) console.log(`agreement ${agree.score}/4 · pipelines ${agree.pipelines} · variants ${agree.variants} · components ${agree.components} · cloud ${agree.cloud}`);
  const at = new Date().toISOString();
  const dir = path.join(dataRoot(), 'onboard-ab');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${at.replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, `${JSON.stringify({ at, root, arms, ...(agree ? { agreement: agree } : {}) }, null, 2)}\n`);
  console.log(`report: ${file}`);
  return arms.every((x) => x.proposal) ? 0 : 1;
}

main(process.argv.slice(2)).then(
  (code) => (process.exitCode = code),
  (e: unknown) => {
    console.error(`onboard:ab: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  },
);
